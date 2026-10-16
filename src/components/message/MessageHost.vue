<script setup lang="ts">
/**
 * 全局消息宿主：由 message.ts 在首次调用时挂载到 body，
 * 渲染顶部居中堆叠的消息胶囊（暗色主题，对齐登录页截图观感）。
 */
import { computed } from "vue";
import { closeMessage, messageList } from "./message";

/** 堆叠容器顶部偏移取第一条消息的 offset（常规场景各消息 offset 一致） */
const stackOffset = computed(() => messageList[0]?.offset ?? 24);
</script>

<template>
  <TransitionGroup name="fnm-message" tag="div" class="fnm-message-stack" :style="{ top: `${stackOffset}px` }">
    <div
      v-for="item in messageList"
      :key="item.id"
      class="fnm-message"
      :class="`fnm-message--${item.type}`"
      role="alert"
    >
      <svg v-if="item.type === 'error'" class="fnm-message__icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill="currentColor" />
        <path d="M6.15 6.15 11.85 11.85M11.85 6.15 6.15 11.85" stroke="#fff" stroke-width="1.7" stroke-linecap="round" fill="none" />
      </svg>
      <svg v-else-if="item.type === 'success'" class="fnm-message__icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill="currentColor" />
        <path d="M5.2 9.4 8 12.1 12.8 6.7" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </svg>
      <svg v-else-if="item.type === 'warning'" class="fnm-message__icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill="currentColor" />
        <path d="M9 4.7v5" stroke="#fff" stroke-width="1.7" stroke-linecap="round" fill="none" />
        <circle cx="9" cy="12.9" r="1.05" fill="#fff" />
      </svg>
      <svg v-else class="fnm-message__icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill="currentColor" />
        <path d="M9 8.1v4.6" stroke="#fff" stroke-width="1.7" stroke-linecap="round" fill="none" />
        <circle cx="9" cy="5.2" r="1.05" fill="#fff" />
      </svg>

      <span class="fnm-message__text">{{ item.message }}</span>

      <button
        v-if="item.showClose"
        type="button"
        class="fnm-message__close"
        aria-label="关闭"
        @click="closeMessage(item.id)"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" />
        </svg>
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.fnm-message-stack {
  position: fixed;
  left: 0;
  right: 0;
  top: 24px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.fnm-message {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(480px, calc(100vw - 48px));
  padding: 8px 16px 8px 11px;
  border-radius: 999px;
  background: rgba(44, 44, 44, 0.96);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  line-height: 20px;
}

.fnm-message__icon {
  flex: none;
}

.fnm-message--error .fnm-message__icon {
  color: #f62c55;
}

.fnm-message--success .fnm-message__icon {
  color: #34c759;
}

.fnm-message--warning .fnm-message__icon {
  color: #f7a417;
}

.fnm-message--info .fnm-message__icon {
  color: #4e9bff;
}

.fnm-message__text {
  min-width: 0;
}

.fnm-message__close {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  width: 18px;
  height: 18px;
  padding: 0;
  margin-left: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.fnm-message__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* 进出场：自顶部下滑 + 渐显（el-message 风格） */
.fnm-message-enter-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fnm-message-leave-active {
  /* 离场脱离文档流，让下方消息平滑上收 */
  position: absolute;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fnm-message-enter-from {
  opacity: 0;
  transform: translateY(-14px);
}

.fnm-message-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fnm-message-move {
  transition: transform 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .fnm-message-enter-active,
  .fnm-message-leave-active,
  .fnm-message-move {
    transition: opacity 0.2s ease;
  }

  .fnm-message-enter-from,
  .fnm-message-leave-to {
    transform: none;
  }
}
</style>
