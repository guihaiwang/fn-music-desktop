<script setup lang="ts">
/**
 * 通用「按钮 + 下拉弹窗」组件（对齐原版 web 的 Semi Dropdown 暗色弹层观感）。
 *
 * 用法一（内置圆形 ··· 触发按钮，对应歌单页「更多操作」）：
 *   <DropdownMenu :items="items" @select="onSelect" />
 *
 * 用法二（自定义触发器，通过默认插槽）：
 *   <DropdownMenu :items="items" placement="bottom-start" @select="onSelect">
 *     <button class="my-btn">操作</button>
 *   </DropdownMenu>
 *
 * 弹出位置 placement：
 *   bottom-start  下左（左对齐触发器）
 *   bottom-center 下中（相对触发器居中）
 *   bottom-end    下右（右对齐触发器，默认）
 *
 * 行为：
 * - 点击触发器开合弹层；选中菜单项、点击外部或按 Esc 后关闭
 * - 弹层 Teleport 到 body，按触发器矩形定位，滚动 / 窗口尺寸变化自动重算
 * - 超出视口自动夹紧；底部空间不足时自动向上翻转
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

export interface DropdownItem {
  /** 唯一标识，select 事件原样回传 */
  key: string;
  label: string;
  /** 菜单图标：原始 SVG 字符串（与 iconfont `?raw` 引入产物一致） */
  icon?: string;
  /** 危险操作，红色文本 */
  danger?: boolean;
  disabled?: boolean;
  /** 在该项上方渲染分割线 */
  divider?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: DropdownItem[];
    /**
     * 弹层位置（相对触发器）：
     * - bottom-start：下左（左对齐触发器）
     * - bottom-center：下中（相对触发器水平居中）
     * - bottom-end：下右（右对齐触发器，默认）
     * 超出视口时自动夹紧；底部空间不足自动向上翻转。
     */
    placement?: "bottom-start" | "bottom-center" | "bottom-end";
    /** 触发方式：click 左键开合；contextmenu 右键在光标处弹出（触发器上点击不响应） */
    trigger?: "click" | "contextmenu";
    disabled?: boolean;
    /** 触发器撑满父容器宽度（如侧边栏用户区等通栏场景） */
    stretch?: boolean;
    /** 弹层最小宽度（px） */
    minWidth?: number;
    zIndex?: number;
  }>(),
  {
    placement: "bottom-end",
    trigger: "click",
    disabled: false,
    stretch: false,
    minWidth: 148,
    zIndex: 2000,
  },
);

const emit = defineEmits<{
  select: [item: DropdownItem];
  visibleChange: [visible: boolean];
  /** 弹层即将打开（右键菜单在打开前拉取数据 / 更新 items 用） */
  beforeOpen: [];
}>();

const triggerRef = ref<HTMLElement | null>(null);
const popupRef = ref<HTMLElement | null>(null);

const visible = ref(false);
const pos = ref({ top: 0, left: 0 });
/** contextmenu 触发时的光标坐标（非空时弹层定位于光标处） */
const cursor = ref<{ x: number; y: number } | null>(null);

const GAP = 8; // 弹层与触发器的间距
const EDGE = 8; // 距视口边缘的最小留白

const transformOrigin = computed(() => {
  if (cursor.value) return "top left";
  switch (props.placement) {
    case "bottom-start":
      return "top left";
    case "bottom-center":
      return "top center";
    default:
      return "top right";
  }
});

async function updatePosition() {
  const popup = popupRef.value;
  if (!popup) return;
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;
  if (cursor.value) {
    // 右键菜单：定位到光标处（夹紧视口内）
    pos.value = {
      top: clamp(cursor.value.y, EDGE, window.innerHeight - ph - EDGE),
      left: clamp(cursor.value.x, EDGE, window.innerWidth - pw - EDGE),
    };
    return;
  }
  const trigger = triggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  let left: number;
  switch (props.placement) {
    case "bottom-start":
      left = rect.left;
      break;
    case "bottom-center":
      left = rect.left + rect.width / 2 - pw / 2;
      break;
    default:
      left = rect.right - pw;
  }
  left = Math.min(Math.max(left, EDGE), window.innerWidth - pw - EDGE);
  let top = rect.bottom + GAP;
  if (top + ph > window.innerHeight - EDGE && rect.top - ph - GAP >= EDGE) {
    top = rect.top - ph - GAP;
  }
  pos.value = { top, left };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function open() {
  if (props.disabled || visible.value) return;
  emit("beforeOpen");
  visible.value = true;
  emit("visibleChange", true);
  void nextTick(updatePosition);
}

function close() {
  if (!visible.value) return;
  visible.value = false;
  cursor.value = null;
  emit("visibleChange", false);
}

function toggle() {
  visible.value ? close() : open();
}

/** contextmenu 触发：记录光标位置并弹出 */
function onContextMenu(e: MouseEvent) {
  if (props.trigger !== "contextmenu" || props.disabled) return;
  e.preventDefault();
  cursor.value = { x: e.clientX, y: e.clientY };
  open();
}

function onSelect(item: DropdownItem) {
  if (item.disabled) return;
  emit("select", item);
  close();
}

function onDocPointerDown(e: PointerEvent) {
  if (!visible.value) return;
  const target = e.target as Node;
  if (popupRef.value?.contains(target)) return;
  if (triggerRef.value?.contains(target)) return;
  close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

function reposition() {
  if (visible.value) void updatePosition();
}

onMounted(() => {
  window.addEventListener("pointerdown", onDocPointerDown, true);
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, { capture: true, passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", onDocPointerDown, true);
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", reposition);
  window.removeEventListener("scroll", reposition, { capture: true });
});

defineExpose({ open, close, toggle });
</script>

<template>
  <span
    ref="triggerRef"
    class="fnm-dropdown"
    :class="{ 'is-disabled': disabled, 'is-stretch': stretch }"
    :role="trigger === 'contextmenu' ? undefined : 'button'"
    aria-haspopup="menu"
    :aria-expanded="trigger === 'click' ? visible : undefined"
    @click="trigger === 'click' && toggle()"
    @contextmenu="onContextMenu"
  >
    <slot>
      <!-- 默认触发器：圆形 ··· 按钮（对齐原版歌单页「更多」按钮） -->
      <button type="button" class="fnm-dropdown__more" :disabled="disabled" tabindex="-1" aria-label="更多操作">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="19" cy="12" r="1.9" />
        </svg>
      </button>
    </slot>
  </span>

  <Teleport to="body">
    <Transition name="fnm-dropdown-pop">
      <div
        v-if="visible"
        ref="popupRef"
        class="fnm-dropdown__popup"
        role="menu"
        :style="{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          minWidth: `${minWidth}px`,
          zIndex,
          transformOrigin,
        }"
      >
        <template v-for="item in items" :key="item.key">
          <div v-if="item.divider" class="fnm-dropdown__divider" role="separator" />
          <div
            class="fnm-dropdown__item"
            role="menuitem"
            :class="{ 'is-danger': item.danger, 'is-disabled': item.disabled }"
            :aria-disabled="item.disabled || undefined"
            @click.stop="onSelect(item)"
          >
            <span v-if="item.icon" class="fnm-dropdown__icon" v-html="item.icon" />
            <span class="fnm-dropdown__label">{{ item.label }}</span>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fnm-dropdown {
  display: inline-flex;
  flex: none;
}

/* 通栏触发器：撑满父容器（用组件自身作用域样式，避免跨组件 :deep 在嵌套 SCSS 下失效） */
.fnm-dropdown.is-stretch {
  width: 100%;
}

.fnm-dropdown.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

/* 内置触发器：圆形 ··· 按钮 */
.fnm-dropdown__more {
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

.fnm-dropdown__more:hover {
  background: rgba(255, 255, 255, 0.16);
}

.fnm-dropdown__more:active {
  transform: scale(0.95);
}

/* 弹层 */
.fnm-dropdown__popup {
  position: fixed;
  padding: 8px;
  border-radius: 10px;
  background: #2a2a2f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
}

.fnm-dropdown__item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color 0.15s;
}

.fnm-dropdown__item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.fnm-dropdown__item:active {
  background: rgba(255, 255, 255, 0.12);
}

.fnm-dropdown__item.is-danger {
  color: #ff6568;
}

.fnm-dropdown__item.is-disabled {
  opacity: 0.4;
  pointer-events: none;
}

.fnm-dropdown__icon {
  display: inline-flex;
  flex: none;
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.85);
}

.fnm-dropdown__item.is-danger .fnm-dropdown__icon {
  color: inherit;
}

/* v-html 注入的 svg 不携带 scoped 属性，需 deep 穿透 */
.fnm-dropdown__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.fnm-dropdown__divider {
  height: 1px;
  margin: 6px 4px;
  background: rgba(255, 255, 255, 0.08);
}

/* 开合动画 */
.fnm-dropdown-pop-enter-active {
  transition: opacity 0.16s ease-out, transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1.15);
}

.fnm-dropdown-pop-leave-active {
  transition: opacity 0.12s ease-in, transform 0.12s ease-in;
}

.fnm-dropdown-pop-enter-from,
.fnm-dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
