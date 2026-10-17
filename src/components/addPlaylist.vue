<script setup lang="ts">
/**
 * 新建/编辑歌单弹窗（对齐原版 web「新建歌单」Modal + 原版截图布局）。
 *
 * - 由父组件常驻挂载，通过 open 控制显隐（Transition 在内部，保证出入场动画生效）
 * - 新建：封面池随机默认封面（src/assets/playlist-covers/*.png，刷新排除当前），
 *   可上传自定义封面（裁剪后应用）；创建时先 uploadCover 换 coverId 再 create({name, coverId})
 * - 编辑（传 editPlaylist）：标题「编辑歌单」，回填名称与现有封面；可改名称，也可用
 *   「刷新/上传/恢复原封面」改封面（上传后有待上传文件时先 uploadCover 换 coverId），
 *   playlist.edit({guid, name, coverId?}) 成功后 emit saved
 * - 名称必填、≤32 字符（原版 nt.playlist.name.maxLength=32，文案取自原版语言包）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { playlistApi, fetchCoverUrl } from "../api/music"
import type { Playlist } from "../api/models"
import { message } from "./message/message"
import ImageCropper from "./imageCropper.vue"
import Refresh from "../assets/iconfont/refresh.svg?raw"
import Delete from "../assets/iconfont/delete.svg?raw"
import Edit from "../assets/iconfont/edit.svg?raw"
import Close from "../assets/iconfont/close.svg?raw"

const props = defineProps<{ open: boolean; editPlaylist?: Playlist | null }>()

const emit = defineEmits<{
    close: []
    created: [playlist: Playlist]
    /** 编辑保存成功，回传更新后的歌单 */
    saved: [playlist: Playlist]
}>()

const isEdit = computed(() => !!props.editPlaylist)

const NAME_MAX_LENGTH = 32
const MAX_FILE_MB = 5
const ACCEPT = ".jpg,.jpeg,.png,.webp"

const nameInput = ref<HTMLInputElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const name = ref("")
const nameError = ref("")
const submitting = ref(false)
const generating = ref(false)

/** 当前封面预览：url 用于 <img>；file 为创建时待上传的文件（编辑模式展示现有封面时为空） */
const preview = ref<{ url: string; file?: File } | null>(null)
/** 是否用户上传的自定义封面（决定删除按钮可用性） */
const isCustomUpload = ref(false)

const objectUrls: string[] = []

function createObjectUrl(file: File): string {
    const url = URL.createObjectURL(file)
    objectUrls.push(url)
    return url
}

/* ==================== 默认封面池（对齐原版 playlist_default_1..4 预设封面） ==================== */

const coverPool: string[] = Object.values(
    import.meta.glob("../assets/playlist-covers/*.png", { eager: true, query: "?url", import: "default" }),
) as string[]

/** 从池中随机取一张（排除上一次使用的），fetch 转 File 作为待上传封面 */
async function applyDefaultCover() {
    if (generating.value) return
    generating.value = true
    try {
        const candidates =
            coverPool.length > 1 && lastAssetUrl.value
                ? coverPool.filter((u) => u !== lastAssetUrl.value)
                : coverPool
        const assetUrl = candidates[Math.floor(Math.random() * candidates.length)] ?? coverPool[0]
        const resp = await fetch(assetUrl)
        const blob = await resp.blob()
        const fileName = assetUrl.split("/").pop() || "playlist-cover.png"
        const file = new File([blob], fileName, { type: blob.type || "image/png" })
        preview.value = { url: createObjectUrl(file), file }
        lastAssetUrl.value = assetUrl
        isCustomUpload.value = false
    } catch {
        message.error("生成默认封面失败")
    } finally {
        generating.value = false
    }
}

const lastAssetUrl = ref("")

/* ==================== 上传自定义封面（选择文件 → 裁剪弹窗 → 确认后应用） ==================== */

/** 裁剪弹窗状态：cropSrc 为待裁剪图片的本地 objectURL */
const cropOpen = ref(false)
const cropSrc = ref("")

function pickCoverFile() {
    fileInput.value?.click()
}

function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
        message.error(`封面文件大小不能超过 ${MAX_FILE_MB}MB`)
        return
    }
    // 进入裁剪流程：预览保持不变，裁剪确认后才应用
    cropSrc.value = createObjectUrl(file)
    cropOpen.value = true
}

/** 裁剪保存：应用裁剪结果 */
function onCropConfirm(file: File) {
    preview.value = { url: createObjectUrl(file), file }
    isCustomUpload.value = true
    cropOpen.value = false
    cropSrc.value = ""
}

/** 裁剪取消：预览保持原样 */
function onCropCancel() {
    cropOpen.value = false
    cropSrc.value = ""
}

/** 编辑模式的原封面 URL（"恢复原封面"用） */
const originalCoverUrl = ref<string | null>(null)

/** 垃圾桶按钮：创建模式=有自定义上传时可用（回随机默认）；编辑模式=有待上传封面时可用（恢复原封面） */
const trashDisabled = computed(() => (isEdit.value ? !preview.value?.file : !isCustomUpload.value))
const trashTitle = computed(() => (isEdit.value ? "恢复原封面" : "删除封面"))

/** 删除/恢复封面：创建模式回随机默认封面；编辑模式恢复原封面 */
function resetCover() {
    if (isEdit.value) {
        if (!preview.value?.file) return
        preview.value = originalCoverUrl.value ? { url: originalCoverUrl.value } : null
        isCustomUpload.value = false
        return
    }
    if (!isCustomUpload.value) return
    void applyDefaultCover()
}

/* ==================== 提交 ==================== */

function validate(): string | null {
    const value = name.value.trim()
    if (!value) return "请输入歌单名称"
    if (value.length > NAME_MAX_LENGTH) return `歌单名称不能超过 ${NAME_MAX_LENGTH} 个字符`
    return null
}

async function submit() {
    if (submitting.value) return
    const error = validate()
    if (error) {
        nameError.value = error
        return
    }
    submitting.value = true
    try {
        if (isEdit.value && props.editPlaylist) {
            // 编辑：名称必改；封面仅在用户更换过（有待上传文件）时先上传再带上新 coverId
            let coverId: string | undefined
            if (preview.value?.file) {
                try {
                    const form = new FormData()
                    form.append("file", preview.value.file)
                    const res = await playlistApi.uploadCover(form)
                    coverId = res.coverId ?? undefined
                } catch {
                    message.warning("封面上传失败，保留原封面")
                }
            }
            await playlistApi.edit({
                guid: props.editPlaylist.guid,
                name: name.value.trim(),
                ...(coverId ? { coverId } : {}),
            })
            message.success("编辑歌单成功")
            emit("saved", {
                ...props.editPlaylist,
                name: name.value.trim(),
                ...(coverId ? { coverId } : {}),
            })
            emit("close")
            return
        }
        // 新建：先上传封面换 coverId（对齐原版 confirmUpload），失败不阻塞创建（服务端会生成默认封面）
        let coverId: string | undefined
        if (preview.value) {
            try {
                const form = new FormData()
                if (preview.value.file) form.append("file", preview.value.file)
                const res = await playlistApi.uploadCover(form)
                coverId = res.coverId ?? undefined
            } catch {
                message.warning("封面上传失败，将使用默认封面")
            }
        }
        const playlist = await playlistApi.create({
            name: name.value.trim(),
            ...(coverId ? { coverId } : {}),
        })
        message.success("新建歌单成功")
        emit("created", playlist)
        emit("close")
    } catch (e) {
        message.error(e instanceof Error ? e.message : isEdit.value ? "编辑歌单失败，请重试" : "新建歌单失败，请重试")
    } finally {
        submitting.value = false
    }
}

function onKeydown(e: KeyboardEvent) {
    // 裁剪弹窗打开时，Esc 交给裁剪器处理
    if (cropOpen.value) return
    if (props.open && e.key === "Escape") emit("close")
}

/** 遮罩点击：裁剪弹窗打开时不关闭底层弹窗 */
function onLayerClick() {
    if (cropOpen.value) return
    emit("close")
}

/* 打开时：按模式初始化 —— 编辑回填名称与现有封面；新建清空表单 + 随机默认封面 */
watch(
    () => props.open,
    async (open) => {
        if (!open) return
        nameError.value = ""
        if (props.editPlaylist) {
            name.value = props.editPlaylist.name
            if (props.editPlaylist.coverId) {
                const url = await fetchCoverUrl(props.editPlaylist.coverId)
                preview.value = url ? { url } : null
                originalCoverUrl.value = url
            } else {
                preview.value = null
                originalCoverUrl.value = null
            }
        } else {
            name.value = ""
            originalCoverUrl.value = null
            await applyDefaultCover()
        }
        void nextTick(() => nameInput.value?.focus())
    },
    { immediate: true },
)

onMounted(() => {
    window.addEventListener("keydown", onKeydown)
})

onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown)
    for (const url of objectUrls) URL.revokeObjectURL(url)
})
</script>

<template>
    <Teleport to="body">
        <Transition name="modal" appear>
            <div v-if="open" class="add-playlist-layer" @click.self="onLayerClick">
                <div class="add-playlist" role="dialog" :aria-label="isEdit ? '编辑歌单' : '新建歌单'">
                    <button type="button" class="add-playlist__close" aria-label="关闭" @click="emit('close')">
                        <span v-html="Close"></span>
                    </button>

                    <h2 class="add-playlist__title">{{ isEdit ? "编辑歌单" : "新建歌单" }}</h2>

                    <!-- 封面面板 -->
                    <div class="add-playlist__panel">
                        <div class="add-playlist__cover">
                            <img v-if="preview" class="add-playlist__cover-img" :src="preview.url" alt=""
                                draggable="false" />
                            <div v-else class="add-playlist__cover-empty" />
                            <div v-if="generating || submitting" class="add-playlist__cover-mask">
                                <span class="spinner" />
                            </div>
                            <div class="add-playlist__cover-actions">
                                <button type="button" class="cover-btn" title="重新生成默认封面"
                                    :disabled="generating || submitting" @click="applyDefaultCover">
                                    <span v-html="Refresh"></span>
                                </button>
                                <div class="add-playlist__cover-actions-right">
                                    <button type="button" class="cover-btn" :title="trashTitle"
                                        :disabled="trashDisabled || submitting" @click="resetCover">
                                        <span v-html="Delete"></span>
                                    </button>
                                    <button type="button" class="cover-btn" title="上传封面"
                                        :disabled="generating || submitting" @click="pickCoverFile">
                                        <span v-html="Edit"></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p class="add-playlist__hint">
                            上传封面，支持 JPG、JPEG、PNG、WEBP，大小 &lt;= {{ MAX_FILE_MB }}MB
                        </p>
                        <input ref="fileInput" class="add-playlist__file" type="file" :accept="ACCEPT"
                            @change="onFileChange" />
                    </div>

                    <!-- 名称面板 -->
                    <div class="add-playlist__panel">
                        <label class="add-playlist__label" for="add-playlist-name">歌单名称</label>
                        <input id="add-playlist-name" ref="nameInput" v-model="name" class="add-playlist__input"
                            type="text" placeholder="请输入歌单名称" maxlength="32" autocomplete="off" spellcheck="false"
                            :class="{ 'is-invalid': !!nameError }" @input="nameError = ''" @keydown.enter="submit" />
                        <div class="add-playlist__error" :class="{ visible: !!nameError }">
                            {{ nameError || "　" }}
                        </div>
                    </div>

                    <div class="add-playlist__footer">
                        <button type="button" class="btn btn--secondary" :disabled="submitting" @click="emit('close')">
                            取消
                        </button>
                        <button type="button" class="btn btn--primary" :disabled="submitting" @click="submit">
                            {{ submitting ? (isEdit ? "保存中..." : "创建中...") : "确定" }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- 图片裁剪弹窗（自定义封面上传后进入） -->
        <ImageCropper :open="cropOpen" :src="cropSrc" @confirm="onCropConfirm" @cancel="onCropCancel" />
    </Teleport>
</template>

<style scoped>
/* ==================== 弹层与出入场动画 ==================== */
.add-playlist-layer {
    position: fixed;
    inset: 0;
    z-index: 2500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: color-mix(in srgb, #000000b3 42%, transparent);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
}

.modal-enter-active {
    transition: opacity 0.28s ease-out;
}

.modal-leave-active {
    transition: opacity 0.22s ease-in;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

/* 面板弹性入场：scale 0.88 → 1 + 上移，明显但不夸张 */
.modal-enter-active .add-playlist {
    transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.28s ease-out;
}

.modal-leave-active .add-playlist {
    transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}

.modal-enter-from .add-playlist {
    transform: scale(0.88) translateY(28px);
    opacity: 0;
}

.modal-leave-to .add-playlist {
    transform: scale(0.94) translateY(12px);
    opacity: 0;
}

/* ==================== 面板 ==================== */
.add-playlist {
    position: relative;
    width: 520px;
    max-width: 100%;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    padding: 22px 24px 20px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 20px;
    background: #141416;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}

.add-playlist__close {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 32px;
    height: 32px;
    padding: 0;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    transition: background-color 0.18s, color 0.18s;
}

.add-playlist__close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
}

.add-playlist__title {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
}

.add-playlist__panel {
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    background: #1e1e21;
}

.add-playlist__panel+.add-playlist__panel {
    margin-top: 14px;
}

/* ==================== 封面 ==================== */
.add-playlist__cover {
    position: relative;
    width: 150px;
    height: 150px;
    margin: 0 auto;
    border-radius: 10px;
    overflow: hidden;
    background: #0c0c0d;
}

.add-playlist__cover-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 编辑模式无封面时的占位 */
.add-playlist__cover-empty {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(120% 90% at 30% 20%, rgba(255, 255, 255, 0.12), transparent 60%),
        #26262b;
}

.add-playlist__cover-mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
}

.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: cover-spin 0.8s linear infinite;
}

@keyframes cover-spin {
    to {
        transform: rotate(360deg);
    }
}

.add-playlist__cover-actions {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 10px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.add-playlist__cover-actions-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cover-btn {
    width: 34px;
    height: 34px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(20, 20, 20, 0.55);
    color: rgba(255, 255, 255, 0.92);
    transition: background-color 0.18s, transform 0.16s, opacity 0.18s;
}

.cover-btn:hover:not(:disabled) {
    background: rgba(20, 20, 20, 0.75);
}

.cover-btn:active:not(:disabled) {
    transform: scale(0.94);
}

.cover-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.add-playlist__hint {
    margin: 12px 0 0;
    text-align: center;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
}

.add-playlist__file {
    display: none;
}

/* ==================== 名称 ==================== */
.add-playlist__label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
}

.add-playlist__input {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 10px;
    outline: none;
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.92);
    font-size: 14px;
    transition: background-color 0.2s, border-color 0.2s;
}

.add-playlist__input::placeholder {
    color: rgba(255, 255, 255, 0.35);
}

.add-playlist__input:focus {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.16);
}

.add-playlist__input.is-invalid {
    border-color: #ff6568;
}

.add-playlist__error {
    height: 18px;
    margin-top: 6px;
    font-size: 12px;
    color: #ff6568;
    opacity: 0;
    transition: opacity 0.15s;
}

.add-playlist__error.visible {
    opacity: 1;
}

/* ==================== 底部按钮 ==================== */
.add-playlist__footer {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-top: 18px;
}

.btn {
    min-width: 180px;
    height: 44px;
    padding: 0 24px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    transition: background-color 0.18s, transform 0.16s, opacity 0.18s;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn--secondary {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
}

.btn--secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
}

/* 品牌红（对齐原版确定按钮） */
.btn--primary {
    background: #f62c55;
    color: #fff;
}

.btn--primary:hover:not(:disabled) {
    background: #e0264c;
}

.btn:not(:disabled):active {
    transform: scale(0.98);
}
</style>
