<script setup lang="ts">
/**
 * 图片裁剪弹窗（对齐原版「裁剪图片」Modal + 截图布局）。
 *
 * - 由父组件常驻挂载，open 控制显隐（Transition 内部，保证出入场动画）
 * - 裁剪框四角手柄拖拽缩放、框内拖拽移动；宽高比 1:1 / 不限制
 * - 保存：按显示坐标映射原图坐标，canvas 裁切输出 webp（质量 0.9 起、超 5MB 逐级降质，
 *   对齐原版 Nw 压缩逻辑），emit confirm(File)
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  /** 待裁剪图片 URL（本地 objectURL） */
  src: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [file: File];
}>();

const MAX_FILE_MB = 5;

const imgRef = ref<HTMLImageElement | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);

/** 图片显示尺寸（CSS 像素） */
const disp = ref({ w: 0, h: 0 });
/** 裁剪框（相对图片显示区域，CSS 像素） */
const crop = ref({ x: 0, y: 0, w: 0, h: 0 });
const aspect = ref<"1:1" | "free">("1:1");
const MIN_SIZE = 24;

const handles = ["nw", "ne", "sw", "se"] as const;
type Corner = (typeof handles)[number];

let drag: {
  type: "move" | Corner;
  startX: number;
  startY: number;
  start: { x: number; y: 0 | number; w: number; h: number };
} | null = null;

const boxStyle = ref<{ left: string; top: string; width: string; height: string }>({
  left: "0px",
  top: "0px",
  width: "0px",
  height: "0px",
});

function syncBoxStyle() {
  boxStyle.value = {
    left: `${crop.value.x}px`,
    top: `${crop.value.y}px`,
    width: `${crop.value.w}px`,
    height: `${crop.value.h}px`,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** 图片加载完成：计算显示尺寸，初始化居中方框（占短边 90%） */
function onImgLoad() {
  const img = imgRef.value;
  if (!img) return;
  const w = img.clientWidth;
  const h = img.clientHeight;
  disp.value = { w, h };
  const s = Math.min(w, h) * 0.9;
  crop.value = { x: (w - s) / 2, y: (h - s) / 2, w: s, h: s };
  syncBoxStyle();
}

/** 切换比例后把当前框调整为正方形（保持中心） */
function applySquare() {
  const { w, h } = disp.value;
  if (!w || !h) return;
  const c = crop.value;
  const s = Math.max(MIN_SIZE, Math.min(c.w, c.h, w, h));
  crop.value = {
    x: clamp(c.x + (c.w - s) / 2, 0, w - s),
    y: clamp(c.y + (c.h - s) / 2, 0, h - s),
    w: s,
    h: s,
  };
  syncBoxStyle();
}

function setAspect(value: "1:1" | "free") {
  if (aspect.value === value) return;
  aspect.value = value;
  if (value === "1:1") applySquare();
}

/* ==================== 指针交互 ==================== */

function onPointerMove(e: PointerEvent) {
  if (!drag) return;
  const { w, h } = disp.value;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  const s0 = drag.start;

  if (drag.type === "move") {
    crop.value = {
      ...s0,
      x: clamp(s0.x + dx, 0, w - s0.w),
      y: clamp(s0.y + dy, 0, h - s0.h),
    };
  } else {
    // 角点缩放：固定对角
    const anchorX = drag.type.includes("w") ? s0.x + s0.w : s0.x;
    const anchorY = drag.type.startsWith("n") ? s0.y + s0.h : s0.y;
    let x2 = e.clientX - (wrapRef.value?.getBoundingClientRect().left ?? 0);
    let y2 = e.clientY - (wrapRef.value?.getBoundingClientRect().top ?? 0);
    x2 = clamp(x2, 0, w);
    y2 = clamp(y2, 0, h);

    if (aspect.value === "1:1") {
      const maxW = drag.type.includes("w") ? anchorX : w - anchorX;
      const maxH = drag.type.startsWith("n") ? anchorY : h - anchorY;
      const size = clamp(Math.max(Math.abs(x2 - anchorX), Math.abs(y2 - anchorY)), MIN_SIZE, Math.min(maxW, maxH));
      const dirX = drag.type.includes("w") ? -1 : 1;
      const dirY = drag.type.startsWith("n") ? -1 : 1;
      crop.value = {
        x: clamp(dirX === 1 ? anchorX : anchorX - size, 0, w - size),
        y: clamp(dirY === 1 ? anchorY : anchorY - size, 0, h - size),
        w: size,
        h: size,
      };
    } else {
      const x1 = clamp(Math.min(anchorX, x2), 0, w);
      const y1 = clamp(Math.min(anchorY, y2), 0, h);
      crop.value = {
        x: x1,
        y: y1,
        w: Math.max(MIN_SIZE, Math.abs(x2 - anchorX)),
        h: Math.max(MIN_SIZE, Math.abs(y2 - anchorY)),
      };
    }
  }
  syncBoxStyle();
}

function onPointerUp() {
  drag = null;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
}

function startDrag(type: "move" | Corner, e: PointerEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  drag = {
    type,
    startX: e.clientX,
    startY: e.clientY,
    start: { ...crop.value, y: crop.value.y },
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

/* ==================== 保存 ==================== */

/** canvas → webp File（超 5MB 逐级降质，对齐原版 Nw） */
function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  let quality = 0.9;
  const maxBytes = MAX_FILE_MB * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("裁剪失败"));
            return;
          }
          if (blob.size <= maxBytes || quality <= 0.4) {
            resolve(new File([blob], "playlist-cover.webp", { type: "image/webp" }));
          } else {
            quality -= 0.05;
            attempt();
          }
        },
        "image/webp",
        quality,
      );
    };
    attempt();
  });
}

async function save() {
  const img = imgRef.value;
  if (!img || disp.value.w === 0) return;
  const scale = img.naturalWidth / disp.value.w;
  const sx = crop.value.x * scale;
  const sy = crop.value.y * scale;
  const sw = Math.max(1, crop.value.w * scale);
  const sh = Math.max(1, crop.value.h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    emit("cancel");
    return;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  try {
    const file = await canvasToFile(canvas);
    emit("confirm", file);
  } catch (e) {
    // 裁剪失败静默关闭，预览保持不变
    void e;
    emit("cancel");
  }
}

function onKeydown(e: KeyboardEvent) {
  if (props.open && e.key === "Escape") emit("cancel");
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
});

// 每次 open 重置比例与裁剪框
watch(
  () => props.open,
  (open) => {
    if (open) {
      aspect.value = "1:1";
      void nextTick(() => {
        if (imgRef.value?.complete) onImgLoad();
      });
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="crop-modal" appear>
      <div v-if="open" class="crop-layer" @click.self="emit('cancel')">
        <div class="crop-panel" role="dialog" aria-label="裁剪图片">
          <button type="button" class="crop-close" aria-label="关闭" @click="emit('cancel')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <h2 class="crop-title">裁剪图片</h2>

          <div class="crop-stage">
            <div ref="wrapRef" class="crop-image-wrap">
              <img ref="imgRef" :src="src" alt="" draggable="false" @load="onImgLoad" />
              <div class="crop-box" :style="boxStyle" @pointerdown="startDrag('move', $event)">
                <span v-for="pos in handles" :key="pos" class="crop-handle" :class="`crop-handle--${pos}`"
                  @pointerdown.stop="startDrag(pos, $event)" />
              </div>
            </div>
          </div>

          <div class="crop-toolbar">
            <span class="crop-toolbar__label">宽高比</span>
            <button type="button" class="ratio-btn" :class="{ 'is-active': aspect === '1:1' }"
              @click="setAspect('1:1')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              1:1
            </button>
            <button type="button" class="ratio-btn" :class="{ 'is-active': aspect === 'free' }"
              @click="setAspect('free')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                <path d="M18 22V8a2 2 0 0 0-2-2H2" />
              </svg>
              不限制
            </button>
          </div>

          <div class="crop-footer">
            <button type="button" class="crop-btn crop-btn--secondary" @click="emit('cancel')">取消</button>
            <button type="button" class="crop-btn crop-btn--primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.crop-layer {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #000000b3 42%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* 出入场动画（与新建歌单弹窗一致） */
.crop-modal-enter-active {
  transition: opacity 0.24s ease-out;
}

.crop-modal-leave-active {
  transition: opacity 0.18s ease-in;
}

.crop-modal-enter-from,
.crop-modal-leave-to {
  opacity: 0;
}

.crop-modal-enter-active .crop-panel {
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.24s ease-out;
}

.crop-modal-leave-active .crop-panel {
  transition: transform 0.18s ease-in, opacity 0.18s ease-in;
}

.crop-modal-enter-from .crop-panel {
  transform: scale(0.9) translateY(22px);
  opacity: 0;
}

.crop-modal-leave-to .crop-panel {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.crop-panel {
  position: relative;
  width: 620px;
  max-width: 100%;
  padding: 22px 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  background: #141416;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}

.crop-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  transition: background-color 0.18s, color 0.18s;
}

.crop-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
}

.crop-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

/* 舞台：图片 + 裁剪框 */
.crop-stage {
  display: flex;
  justify-content: center;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: #1e1e21;
}

.crop-image-wrap {
    position: relative;
    line-height: 0;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
}

.crop-image-wrap img {
    display: block;
    max-width: 100%;
    max-height: 400px;
    width: auto;
    height: auto;
    border-radius: 6px;
}

.crop-box {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.9);
    /* 裁剪框外部压暗（对齐原版观感） */
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
    cursor: move;
    touch-action: none;
}

.crop-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

.crop-handle--nw {
  left: -5px;
  top: -5px;
  cursor: nwse-resize;
}

.crop-handle--ne {
  right: -5px;
  top: -5px;
  cursor: nesw-resize;
}

.crop-handle--sw {
  left: -5px;
  bottom: -5px;
  cursor: nesw-resize;
}

.crop-handle--se {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}

/* 工具条 */
.crop-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.crop-toolbar__label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.ratio-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  transition: border-color 0.18s, color 0.18s, background-color 0.18s;
}

.ratio-btn:hover {
  color: rgba(255, 255, 255, 0.92);
}

.ratio-btn.is-active {
  border-color: #f62c55;
  color: #f62c55;
  background: rgba(246, 44, 85, 0.08);
}

.crop-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.crop-btn {
  min-width: 140px;
  height: 42px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.18s, transform 0.16s;
}

.crop-btn:not(:disabled):active {
  transform: scale(0.98);
}

.crop-btn--secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
}

.crop-btn--secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}

.crop-btn--primary {
  background: #f62c55;
  color: #fff;
}

.crop-btn--primary:hover {
  background: #e0264c;
}
</style>
