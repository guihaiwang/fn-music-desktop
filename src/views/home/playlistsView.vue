<script setup lang="ts">
/**
 * 歌单页（骨架）。
 * 顶部操作区接入 DropdownMenu 通用组件，复刻原版歌单页「筛选 + 更多操作」：
 * 菜单项（多选 / 清除失效歌曲 / 编辑 / 删除）当前仅以 message 演示回传，
 * 后续实现具体功能时替换 onSelect 中的分支即可。
 */
import DropdownMenu, { type DropdownItem } from "../../components/DropdownMenu.vue";
import { message } from "../../components/message/message";

/* 顶部圆形筛选按钮图标（lucide list-filter 风格） */
const FilterIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`;

/* 菜单项图标（lucide 风格，16px 描边） */
const MultiSelectIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 5.5 1.6 1.6L7.4 4.3"/><path d="m3 12.5 1.6 1.6L7.4 11.3"/><path d="M11.5 6H21"/><path d="M11.5 13H21"/><path d="M3.5 19.5H21"/></svg>`;
const CleanInvalidIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h9"/><path d="M4 18h9"/><path d="m16.2 15.2 5.6 5.6"/><path d="m21.8 15.2-5.6 5.6"/></svg>`;
const EditIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
const TrashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;

const moreItems: DropdownItem[] = [
  { key: "multi-select", label: "多选", icon: MultiSelectIcon },
  { key: "clean-invalid", label: "清除失效歌曲", icon: CleanInvalidIcon },
  { key: "edit", label: "编辑", icon: EditIcon },
  { key: "delete", label: "删除", icon: TrashIcon },
];

function onSelect(item: DropdownItem) {
  // TODO: 接入具体功能（多选模式 / 清除失效歌曲 / 编辑歌单 / 删除歌单）
  message.info(`演示：${item.label}`);
}

function onFilter() {
  // TODO: 接入排序 / 筛选弹层
  message.info("演示：筛选");
}
</script>

<template>
  <div class="playlists-page">
    <div class="actions">
      <button type="button" class="round-btn" title="筛选" aria-label="筛选" @click="onFilter">
        <span class="round-btn__icon" v-html="FilterIcon" />
      </button>
      <DropdownMenu :items="moreItems" @select="onSelect" />
    </div>

    <div class="list">
      <!-- TODO: 歌单列表 -->
    </div>
  </div>
</template>

<style scoped>
.playlists-page {
  height: 100%;
  padding: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

/* 与 DropdownMenu 内置触发按钮保持同一观感 */
.round-btn {
  width: 46px;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.92);
  transition: background-color 0.18s, transform 0.16s;
}

.round-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

.round-btn:active {
  transform: scale(0.95);
}

.round-btn__icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
}

.round-btn__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
