<script setup lang="ts">
/**
 * 通用滚动条组件（仿 el-scrollbar）。
 *
 * 原理：外层容器 overflow:hidden，内层 wrap 保留原生滚动但把原生滚动条隐藏，
 * 再叠加一层绝对定位的自绘滑块 —— 因此滚动条既「不占用内容宽高」，也不会随
 * 内容出现/消失引起布局跳动；内容不足一屏时滑块自动隐藏。
 *
 * 基础用法（父容器需给定高度，如 flex 子项加 min-height:0）：
 *   <Scrollbar class="my-list">
 *     <div v-for="item in list" :key="item.id">{{ item.name }}</div>
 *   </Scrollbar>
 *
 * 固定高度 / 最大高度（数字按 px，字符串原样透传）：
 *   <Scrollbar :height="300" />
 *   <Scrollbar max-height="calc(100vh - 120px)" />
 *
 * 滑块显示时机：
 *   - 默认：悬停滚动区或拖动滑块时显示，其余时刻隐藏；隐藏时 pointer-events:none，
 *     不会拦截下方内容的点击（配合下方「预留留白」可彻底避免遮挡按钮）
 *   - <Scrollbar always> ：常显（内容可滚动时）
 *   - 想要滑块完全不压住内容：给 wrap 预留留白即可，滑块只落在留白里，例如
 *       .my-list :deep(.fnm-scrollbar__wrap) { padding-right: 10px }
 *   - 需要彻底隐藏滑块的场景（如侧边栏收起，内容很窄）：在父级覆盖
 *     `.fnm-scrollbar__bar { display: none }`（滚动仍然可用，只是不显示自绘滑块）
 *
 * 自定义外观（在组件或祖先上覆盖 CSS 变量）：
 *   .my-list {
 *     --fnm-scrollbar-thickness: 10px;                        // 滑轨命中区粗细
 *     --fnm-scrollbar-thumb-color: rgba(255, 255, 255, 0.3);  // 滑块颜色
 *     --fnm-scrollbar-thumb-color-hover: rgba(255, 255, 255, 0.5);
 *   }
 *
 * 程序化控制（模板 ref，类型用 InstanceType<typeof Scrollbar>）：
 *   const sb = ref<InstanceType<typeof Scrollbar>>()
 *   sb.value?.scrollTo({ top: 200, behavior: "smooth" })
 *   sb.value?.setScrollTop(0)
 *   sb.value?.update()          // 手动刷新滑块尺寸（一般无需调用）
 *
 * 槽位结构（对应 el-scrollbar）：
 *   container(.fnm-scrollbar, overflow:hidden)
 *     └─ wrap(.fnm-scrollbar__wrap, 原生滚动 + 隐藏原生滚动条, 可透传 wrapClass/wrapStyle)
 *         └─ view(.fnm-scrollbar__view, 内容层, 可透传 viewClass/viewStyle)
 *     └─ bar x2(.fnm-scrollbar__bar, 自绘滑轨/滑块)
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import type { CSSProperties } from "vue"

type Axis = "x" | "y"
type CssUnit = number | string

const props = withDefaults(
  defineProps<{
    /** 固定高度（数字 = px，字符串原样），不传则由父容器决定高度 */
    height?: CssUnit
    /** 最大高度（数字 = px，字符串原样） */
    maxHeight?: CssUnit
    /** true 时保留原生滚动条、不渲染自绘滑块（降级/特殊场景用） */
    native?: boolean
    /** true 时滑块常显；false（默认）为悬停容器 / 拖动时显示 */
    always?: boolean
    /** 内容层（view）使用的标签名 */
    tag?: string
    /** 透传到 wrap 层的 class / style */
    wrapClass?: string | unknown[]
    wrapStyle?: string | CSSProperties
    /** 透传到 view 层的 class / style */
    viewClass?: string | unknown[]
    viewStyle?: string | CSSProperties
  }>(),
  { native: false, always: false, tag: "div" },
)

const emit = defineEmits<{
  /** 滚动时触发 */
  scroll: [pos: { scrollTop: number; scrollLeft: number }]
}>()

const wrapRef = ref<HTMLElement | null>(null)
const viewRef = ref<HTMLElement | null>(null)

/** 可视区 / 内容区比值，>=1 表示该方向不可滚动（滑块隐藏） */
const heightRatio = ref(1)
const widthRatio = ref(1)
/** 滑块位移，单位为「滑块自身高度的百分比」（transform: translate 百分比参照自身尺寸） */
const moveY = ref(0)
const moveX = ref(0)
const dragging = ref<Axis | null>(null)

const canScrollY = computed(() => heightRatio.value < 1)
const canScrollX = computed(() => widthRatio.value < 1)

const sizeStyle = computed<CSSProperties>(() => {
  if (props.height != null) return { height: toCssUnit(props.height) }
  if (props.maxHeight != null) return { maxHeight: toCssUnit(props.maxHeight) }
  return {}
})

const thumbStyleY = computed<CSSProperties>(() => ({
  height: `${heightRatio.value * 100}%`,
  transform: `translateY(${moveY.value}%)`,
}))

const thumbStyleX = computed<CSSProperties>(() => ({
  width: `${widthRatio.value * 100}%`,
  transform: `translateX(${moveX.value}%)`,
}))

function toCssUnit(v: CssUnit): string {
  return typeof v === "number" ? `${v}px` : v
}

/** 重新测量滑块尺寸与位置（内容/容器尺寸变化后需调用，通常由 ResizeObserver 自动触发） */
function update() {
  const wrap = wrapRef.value
  if (!wrap) return
  const ch = wrap.clientHeight
  const cw = wrap.clientWidth
  const sh = wrap.scrollHeight
  const sw = wrap.scrollWidth
  heightRatio.value = sh > ch && sh > 0 ? ch / sh : 1
  widthRatio.value = sw > cw && sw > 0 ? cw / sw : 1
  moveY.value = ch > 0 ? (wrap.scrollTop * 100) / ch : 0
  moveX.value = cw > 0 ? (wrap.scrollLeft * 100) / cw : 0
}

function handleScroll() {
  const wrap = wrapRef.value
  if (!wrap) return
  moveY.value = wrap.clientHeight > 0 ? (wrap.scrollTop * 100) / wrap.clientHeight : 0
  moveX.value = wrap.clientWidth > 0 ? (wrap.scrollLeft * 100) / wrap.clientWidth : 0
  emit("scroll", { scrollTop: wrap.scrollTop, scrollLeft: wrap.scrollLeft })
}

function scrollTo(options: ScrollToOptions): void
function scrollTo(x: number, y?: number): void
function scrollTo(arg1: number | ScrollToOptions, arg2?: number) {
  const wrap = wrapRef.value
  if (!wrap) return
  if (typeof arg1 === "number") wrap.scrollTo(arg1, arg2 ?? 0)
  else wrap.scrollTo(arg1)
}

function setScrollTop(top: number) {
  if (wrapRef.value) wrapRef.value.scrollTop = top
}

function setScrollLeft(left: number) {
  if (wrapRef.value) wrapRef.value.scrollLeft = left
}

/* ---------------- 滑块拖动 ---------------- */

let dragState: {
  axis: Axis
  cursorStart: number
  scrollStart: number
  thumbSize: number
} | null = null
let prevBodyUserSelect = ""

function onThumbDown(axis: Axis, e: MouseEvent) {
  // 仅响应鼠标左键；native 模式无自绘滑块
  if (e.button !== 0 || props.native) return
  const wrap = wrapRef.value
  const thumb = e.currentTarget as HTMLElement | null
  if (!wrap || !thumb) return
  e.preventDefault() // 阻止拖动时选中文本
  dragState = {
    axis,
    cursorStart: axis === "y" ? e.clientY : e.clientX,
    scrollStart: axis === "y" ? wrap.scrollTop : wrap.scrollLeft,
    thumbSize: axis === "y" ? thumb.offsetHeight : thumb.offsetWidth,
  }
  dragging.value = axis
  prevBodyUserSelect = document.body.style.userSelect
  document.body.style.userSelect = "none"
  window.addEventListener("mousemove", onDragMove)
  window.addEventListener("mouseup", onDragEnd)
}

function onDragMove(e: MouseEvent) {
  const wrap = wrapRef.value
  const st = dragState
  if (!wrap || !st) return
  e.preventDefault()
  // 滑块位移 dpx ↔ 内容位移：d * 可视区 / 滑块长度
  const delta = (st.axis === "y" ? e.clientY : e.clientX) - st.cursorStart
  const client = st.axis === "y" ? wrap.clientHeight : wrap.clientWidth
  const offset = st.thumbSize > 0 ? (delta * client) / st.thumbSize : 0
  if (st.axis === "y") wrap.scrollTop = st.scrollStart + offset
  else wrap.scrollLeft = st.scrollStart + offset
}

function onDragEnd() {
  dragState = null
  dragging.value = null
  document.body.style.userSelect = prevBodyUserSelect
  window.removeEventListener("mousemove", onDragMove)
  window.removeEventListener("mouseup", onDragEnd)
}

/* ---------------- 点击滑轨跳转 ---------------- */

function onTrackDown(axis: Axis, e: MouseEvent) {
  if (e.button !== 0 || props.native) return
  const wrap = wrapRef.value
  const track = e.currentTarget as HTMLElement | null
  if (!wrap || !track) return
  const thumb = track.querySelector<HTMLElement>(".fnm-scrollbar__thumb")
  if (!thumb) return

  const trackRect = track.getBoundingClientRect()
  const trackSize = axis === "y" ? trackRect.height : trackRect.width
  const thumbSize = axis === "y" ? thumb.offsetHeight : thumb.offsetWidth
  const clickPos = (axis === "y" ? e.clientY : e.clientX) - (axis === "y" ? trackRect.top : trackRect.left)
  const scrollRange =
    axis === "y" ? wrap.scrollHeight - wrap.clientHeight : wrap.scrollWidth - wrap.clientWidth
  const maxThumbOffset = trackSize - thumbSize
  if (maxThumbOffset <= 0 || scrollRange <= 0) return

  // 目标：滑块中心对齐点击位置（与 el-scrollbar 行为一致）
  const thumbOffset = Math.min(Math.max(clickPos - thumbSize / 2, 0), maxThumbOffset)
  const target = (thumbOffset / maxThumbOffset) * scrollRange
  if (axis === "y") wrap.scrollTop = target
  else wrap.scrollLeft = target
}

/* ---------------- 尺寸监听 ---------------- */

let resizeObserver: ResizeObserver | null = null

function observe() {
  resizeObserver?.disconnect()
  if (props.native || typeof ResizeObserver === "undefined") return
  resizeObserver = new ResizeObserver(update)
  if (wrapRef.value) resizeObserver.observe(wrapRef.value)
  if (viewRef.value) resizeObserver.observe(viewRef.value)
  void nextTick(update)
}

watch(
  () => props.native,
  () => void nextTick(observe),
)

onMounted(observe)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (dragState) onDragEnd()
})

defineExpose({
  /** 原生滚动容器，可自行读取 scrollTop 等属性 */
  wrapRef,
  /** 重新测量滑块 */
  update,
  scrollTo,
  setScrollTop,
  setScrollLeft,
})
</script>

<template>
  <div class="fnm-scrollbar" :class="{ 'is-native': native, 'is-always': always, 'is-dragging': dragging }">
    <div ref="wrapRef" class="fnm-scrollbar__wrap" :class="wrapClass" :style="[sizeStyle, wrapStyle]"
      @scroll="handleScroll">
      <component :is="tag" ref="viewRef" class="fnm-scrollbar__view" :class="viewClass" :style="viewStyle">
        <slot />
      </component>
    </div>

    <template v-if="!native">
      <div v-show="canScrollY" class="fnm-scrollbar__bar is-vertical" @mousedown="onTrackDown('y', $event)">
        <div class="fnm-scrollbar__thumb" :style="thumbStyleY" @mousedown.stop="onThumbDown('y', $event)" />
      </div>
      <div v-show="canScrollX" class="fnm-scrollbar__bar is-horizontal" @mousedown="onTrackDown('x', $event)">
        <div class="fnm-scrollbar__thumb" :style="thumbStyleX" @mousedown.stop="onThumbDown('x', $event)" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.fnm-scrollbar {
  --fnm-scrollbar-thickness: 8px;
  --fnm-scrollbar-thumb-color: rgba(255, 255, 255, 0.24);
  --fnm-scrollbar-thumb-color-hover: rgba(255, 255, 255, 0.4);

  position: relative;
  overflow: hidden;
  height: 100%;
}

/* 滚动层：保留原生滚动能力，隐藏原生滚动条（宽度 0，不占内容空间） */
.fnm-scrollbar__wrap {
  height: 100%;
  overflow: auto;
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* 旧 Edge */
}

.fnm-scrollbar__wrap::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

/* native 模式：还原原生滚动条 */
.fnm-scrollbar.is-native .fnm-scrollbar__wrap {
  scrollbar-width: auto;
  -ms-overflow-style: auto;
}

.fnm-scrollbar.is-native .fnm-scrollbar__wrap::-webkit-scrollbar {
  display: block;
  width: auto;
  height: auto;
}

/* 内容层 */
.fnm-scrollbar__view {
  min-width: 100%;
}

/* 滑轨：绝对定位叠加，不占用内容宽高；隐藏时 pointer-events:none，绝不拦截内容点击 */
.fnm-scrollbar__bar {
  position: absolute;
  z-index: 10;
  display: flex;
  border-radius: 999px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, width 0.15s ease;
}

/* 显示时机：悬停容器 / 常显 / 拖动中（拖动时指针可能离开容器，需保持可见） */
.fnm-scrollbar:hover>.fnm-scrollbar__bar,
.fnm-scrollbar.is-always .fnm-scrollbar__bar,
.fnm-scrollbar.is-dragging .fnm-scrollbar__bar {
  opacity: 1;
  pointer-events: auto;
}

.fnm-scrollbar__bar.is-vertical {
  top: 2px;
  bottom: 2px;
  right: 2px;
  width: var(--fnm-scrollbar-thickness);
  flex-direction: column;
  align-items: center;
}

.fnm-scrollbar__bar.is-horizontal {
  left: 2px;
  right: 2px;
  bottom: 2px;
  height: var(--fnm-scrollbar-thickness);
  align-items: center;
}

/* 滑块：尺寸/位移由内联样式控制（height/width 百分比 + translate 自身百分比） */
.fnm-scrollbar__thumb {
  flex: none;
  border-radius: 999px;
  background: var(--fnm-scrollbar-thumb-color);
  transition: background-color 0.2s;
  cursor: default;
}

.is-vertical .fnm-scrollbar__thumb {
  width: calc(var(--fnm-scrollbar-thickness) - 2px);
}

.is-horizontal .fnm-scrollbar__thumb {
  height: calc(var(--fnm-scrollbar-thickness) - 2px);
}

.fnm-scrollbar__bar:hover .fnm-scrollbar__thumb,
.fnm-scrollbar.is-dragging .fnm-scrollbar__thumb {
  background: var(--fnm-scrollbar-thumb-color-hover);
}
</style>
