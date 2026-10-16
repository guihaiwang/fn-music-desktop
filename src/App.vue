<script setup lang="ts">
import { platform } from '@tauri-apps/plugin-os'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { onMounted, ref, useTemplateRef } from 'vue'

const currentPlatform = ref('')
const minimize = useTemplateRef('titlebar-minimize')
const close = useTemplateRef('titlebar-close')
const isMaximized = ref(false)


onMounted(async () => {
  try {
    const appWindow = getCurrentWindow()
    isMaximized.value = await appWindow.isMaximized()
    currentPlatform.value = platform()
    await appWindow.show()

    if (currentPlatform.value == 'windows') {
      appWindow.listen('tauri://resize', async () => {
        isMaximized.value = await appWindow.isMaximized()
      })

      minimize.value
        ?.addEventListener('click', () => appWindow.minimize())
      close.value
        ?.addEventListener('click', () => appWindow.hide())
    }
  } catch (error) {
    currentPlatform.value = ''
  }
})
</script>

<template>
  <div class="titlebar" v-if="currentPlatform == 'windows'">
    <div data-tauri-drag-region></div>
    <div class="controls">
      <button ref="titlebar-minimize" title="最小化">
        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path d="M 3 8 H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
        </svg>
      </button>
      <button id="snap-btn" title="最大化">
        <template v-if="isMaximized">
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" />
          </svg>
        </template>
        <template v-else>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
            <rect x="2" y="5" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M6 2 H12 A1 1 0 0 1 13 3 V9" stroke="currentColor" stroke-width="1.5" fill="none"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </template>
      </button>
      <button ref="titlebar-close" title="关闭">
        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.2 4.2 L11.8 11.8 M11.8 4.2 L4.2 11.8" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" fill="none" />
        </svg>
      </button>
    </div>
  </div>
  <router-view />
</template>

<style scoped>
.titlebar {
  height: 40px;
  background: transparent;
  user-select: none;
  display: grid;
  grid-template-columns: auto max-content;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.titlebar>.controls {
  display: flex;
}

.titlebar button {
  cursor: default;
  appearance: none;
  padding: 0;
  margin: 0;
  border: none;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  background-color: transparent;
  color: #fff;
}

.titlebar button:hover {
  background: rgba(255, 255, 255, 0.1);
}

#snap-btn:hover,
#snap-btn.is-hovered {
  background: rgba(255, 255, 255, 0.1);
}
</style>