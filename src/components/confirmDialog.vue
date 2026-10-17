<script setup lang="ts">
/**
 * 通用确认弹窗（对齐原版「删除歌单」确认框：图标 + 标题 + 描述 + 取消/确认）。
 *
 * - 由父组件常驻挂载，open 控制显隐（Transition 内部，保证出入场动画）
 * - 取消按钮为暗底红边，确认按钮为品牌红胶囊（危险操作观感，对齐原版截图）
 */
import { onBeforeUnmount, onMounted } from "vue"
import Delete from "../assets/iconfont/delete.svg?raw"

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    /** 确认中：禁用按钮 */
    loading?: boolean
  }>(),
  { confirmText: "确定", cancelText: "取消", loading: false },
)

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (props.open && e.key === "Escape") emit("cancel")
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-modal" appear>
      <div v-if="open" class="confirm-layer" @click.self="emit('cancel')">
        <div class="confirm-dialog" role="alertdialog" :aria-label="title">
          <!-- 图标：灰色堆叠盒 + 红色垃圾桶徽章（对齐原版） -->
          <span class="confirm-dialog__badge" v-html="Delete"></span>

          <h2 class="confirm-dialog__title">{{ title }}</h2>
          <p class="confirm-dialog__desc">{{ description }}</p>

          <div class="confirm-dialog__footer">
            <button type="button" class="cbtn cbtn--cancel" :disabled="loading" @click="emit('cancel')">
              {{ cancelText }}
            </button>
            <button type="button" class="cbtn cbtn--danger" :disabled="loading" @click="emit('confirm')">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-layer {
  position: fixed;
  inset: 0;
  z-index: 2700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #000000b3 42%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* 出入场动画（与新建歌单弹窗同款） */
.confirm-modal-enter-active {
  transition: opacity 0.24s ease-out;
}

.confirm-modal-leave-active {
  transition: opacity 0.18s ease-in;
}

.confirm-modal-enter-from,
.confirm-modal-leave-to {
  opacity: 0;
}

.confirm-modal-enter-active .confirm-dialog {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.24s ease-out;
}

.confirm-modal-leave-active .confirm-dialog {
  transition: transform 0.18s ease-in, opacity 0.18s ease-in;
}

.confirm-modal-enter-from .confirm-dialog {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.confirm-modal-leave-to .confirm-dialog {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.confirm-dialog {
  position: relative;
  width: 440px;
  max-width: 100%;
  padding: 32px 32px 28px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  background: #141416;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}

/* 图标组合：灰盒 + 红徽章 */
.confirm-dialog__icon {
  position: relative;
  width: 88px;
  height: 76px;
  margin-bottom: 20px;
}

.confirm-dialog__icon>svg {
  position: absolute;
  inset: 0;
}

.confirm-dialog__badge {
  width: 50px;
  height: 50px;
  font-size: 24px;
  margin-bottom: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f62c55;
  box-shadow: 0 0 0 3px #141416;
}

.confirm-dialog__title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.confirm-dialog__desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.62);
}

.confirm-dialog__footer {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 28px;
}

.cbtn {
  flex: 1;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.18s, transform 0.16s, opacity 0.18s, border-color 0.18s;
}

.cbtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cbtn:not(:disabled):active {
  transform: scale(0.98);
}

/* 取消：暗底红边（对齐原版危险确认框） */
.cbtn--cancel {
  border: 1px solid #f62c55;
  background: rgba(246, 44, 85, 0.06);
  color: rgba(255, 255, 255, 0.92);
}

.cbtn--cancel:hover:not(:disabled) {
  background: rgba(246, 44, 85, 0.14);
}

.cbtn--danger {
  border: 0;
  background: #f62c55;
  color: #fff;
}

.cbtn--danger:hover:not(:disabled) {
  background: #e0264c;
}
</style>
