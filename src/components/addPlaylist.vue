<script setup lang="ts">
/**
 * 新建歌单弹窗（对齐原版 web「新建歌单」Modal：宽 520、封面装饰预览 + 歌单名称 + 取消/确定）。
 *
 * - 名称必填、≤32 字符（原版 nt.playlist.name.maxLength=32，文案取自原版语言包）
 * - 封面：v1 仅展示原版同款 CSS 装饰占位（不传 coverId，由服务端生成默认封面），
 *   上传/裁剪封面后续接入 playlistApi.uploadCover
 * - 创建成功后 emit created(Playlist)，由父组件关闭弹窗并更新列表
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { playlistApi } from "../api/music";
import type { Playlist } from "../api/models";
import { message } from "./message/message";

const emit = defineEmits<{
  close: [];
  created: [playlist: Playlist];
}>();

const NAME_MAX_LENGTH = 32;

const nameInput = ref<HTMLInputElement | null>(null);
const name = ref("");
const nameError = ref("");
const submitting = ref(false);

function validate(): string | null {
  const value = name.value.trim();
  if (!value) return "请输入歌单名称";
  if (value.length > NAME_MAX_LENGTH) return `歌单名称不能超过 ${NAME_MAX_LENGTH} 个字符`;
  return null;
}

async function submit() {
  if (submitting.value) return;
  const error = validate();
  if (error) {
    nameError.value = error;
    return;
  }
  submitting.value = true;
  try {
    const playlist = await playlistApi.create({ name: name.value.trim() });
    message.success("新建歌单成功");
    emit("created", playlist);
    emit("close");
  } catch (e) {
    message.error(e instanceof Error ? e.message : "新建歌单失败，请重试");
  } finally {
    submitting.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  void nextTick(() => nameInput.value?.focus());
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="add-playlist-layer" @click.self="emit('close')">
      <div class="add-playlist" role="dialog" aria-label="新建歌单">
        <h2 class="add-playlist__title">新建歌单</h2>

        <!-- 封面占位（原版同款：彩色底 + 白色半透明椭圆装饰） -->
        <div class="add-playlist__cover">
          <div class="add-playlist__cover-bg">
            <span class="deco deco-1" />
            <span class="deco deco-2" />
            <span class="deco deco-3" />
          </div>
        </div>

        <div class="add-playlist__field">
          <label class="add-playlist__label" for="add-playlist-name">歌单名称</label>
          <input
            id="add-playlist-name"
            ref="nameInput"
            v-model="name"
            class="add-playlist__input"
            type="text"
            placeholder="请输入歌单名称"
            maxlength="32"
            autocomplete="off"
            spellcheck="false"
            :class="{ 'is-invalid': !!nameError }"
            @input="nameError = ''"
            @keydown.enter="submit"
          />
          <div class="add-playlist__error" :class="{ visible: !!nameError }">
            {{ nameError || "　" }}
          </div>
        </div>

        <div class="add-playlist__footer">
          <button type="button" class="btn btn--secondary" :disabled="submitting" @click="emit('close')">
            取消
          </button>
          <button type="button" class="btn btn--primary" :disabled="submitting" @click="submit">
            {{ submitting ? "创建中..." : "确定" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
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

.add-playlist {
  position: relative;
  width: 520px;
  max-width: 100%;
  padding: 24px 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: #26262b;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.add-playlist__title {
  margin: 0 0 20px;
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

/* 封面占位 */
.add-playlist__cover {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
}

.add-playlist__cover-bg {
  position: absolute;
  inset: 0;
  opacity: 0.9;
  background: linear-gradient(135deg, var(--ds-accent-red) 0%, var(--ds-accent-orange) 100%);
}

.deco {
  position: absolute;
  display: block;
}

.deco-1 {
  left: -32px;
  top: 8px;
  width: 144px;
  height: 48px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  filter: blur(1px);
  transform: rotate(-28deg);
}

.deco-2 {
  left: 12px;
  top: 36px;
  width: 128px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  filter: blur(1px);
  transform: rotate(-28deg);
}

.deco-3 {
  right: 0;
  bottom: 0;
  width: 64px;
  height: 64px;
  border-top-left-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

/* 名称输入 */
.add-playlist__field {
  margin-top: 20px;
}

.add-playlist__label {
  display: block;
  margin-bottom: 6px;
  padding-left: 2px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.62);
}

.add-playlist__input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  transition: background-color 0.2s, border-color 0.2s;
}

.add-playlist__input::placeholder {
  color: rgba(255, 255, 255, 0.38);
}

.add-playlist__input:focus {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
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

/* 底部按钮 */
.add-playlist__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  min-width: 88px;
  height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
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

.btn--primary {
  background: #fff;
  color: #000;
}

.btn--primary:hover:not(:disabled) {
  background: #ebebeb;
}

.btn:not(:disabled):active {
  transform: scale(0.98);
}
</style>
