<script setup lang="ts">
/**
 * 登录页 WebGL 背景 —— 使用原版飞牛音乐 web 的 three.js chunk（vendor/three-original.js）
 * 与原版初始化逻辑逐行对应（oe 函数）：
 *   Scene + OrthographicCamera(-1,1,1,-1,.1,10) + WebGLRenderer(alpha,antialias,high-performance)
 *   PlaneGeometry(2,2) + ShaderMaterial(原版 shader) + Clock + 鼠标 lerp(0.05) + dispose/forceContextLoss
 * shader 源码（ie/ae）为原版 chunk 原文。
 */
import { onMounted, onUnmounted, ref } from "vue";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Vector2,
  Clock,
  Color,
  NormalBlending,
} from "../vendor/three-original.js";

/* 原版 oe 的 containerRef 指向 .auth-background__webgl 子层 */
const webglEl = ref<HTMLElement | null>(null);

/* 原版 vertex shader（ie） */
const VERT = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

/* 原版 fragment shader（ae） */
const FRAG = `
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_colorCore;
uniform vec3 u_colorFringe;
uniform float u_isLightMode;
varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );

  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;

  x12.xy -= i1;
  i = mod289(i);

  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) +
    i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
    0.5 - vec3(
      dot(x0, x0),
      dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)
    ),
    0.0
  );

  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;

  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 st = uv - 0.5;

  st.x *= u_resolution.x / u_resolution.y;

  vec2 mouseOffset = (u_mouse - 0.5) * 0.05;
  st += mouseOffset;

  float n = snoise(st * 1.2 + u_time * 0.18);
  vec2 warpedUV = uv + vec2(n * 0.15);

  vec3 colOrange = vec3(0.98, 0.45, 0.08);
  vec3 colYellow = vec3(0.98, 0.80, 0.15);
  vec3 colPurple = vec3(0.35, 0.10, 0.70);
  vec3 colPink = vec3(0.90, 0.15, 0.45);

  vec2 pYellow = vec2(0.2 + sin(u_time * 0.32) * 0.12, -0.1 + cos(u_time * 0.26) * 0.11);
  vec2 pOrange = vec2(0.8 + cos(u_time * 0.38) * 0.12, -0.1 + sin(u_time * 0.30) * 0.11);
  vec2 pPink = vec2(0.7 + sin(u_time * 0.20) * 0.16, 0.30 + cos(u_time * 0.44) * 0.11);
  vec2 pPurple = vec2(0.3 + cos(u_time * 0.26) * 0.16, 0.40 + sin(u_time * 0.34) * 0.11);

  float wYellow = smoothstep(0.90, 0.0, distance(warpedUV, pYellow));
  float wOrange = smoothstep(1.00, 0.1, distance(warpedUV, pOrange));
  float wPink = smoothstep(0.80, 0.0, distance(warpedUV, pPink));
  float wPurple = smoothstep(0.90, 0.0, distance(warpedUV, pPurple));

  vec3 color = colYellow * (wYellow * 1.2)
             + colOrange * (wOrange * 1.0)
             + colPink * (wPink * 0.9)
             + colPurple * (wPurple * 1.1);

  float breath = 0.5 + 0.5 * sin(u_time * 0.55);
  float vFade = smoothstep(0.88 + breath * 0.06, 0.08, uv.y);
  color *= vFade;

  vec3 bg = mix(vec3(0.059), vec3(0.94, 0.95, 0.96), u_isLightMode);
  if (u_isLightMode > 0.5) {
    color = color * 0.5 + 0.3;
    color = mix(bg, color, vFade * 0.6);
  } else {
    color = mix(bg, color, 1.0);
  }

  color += (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015;

  gl_FragColor = vec4(color, 1.0);
}
`;

/* 原版 T()：容器尺寸 */
function getSize(el: HTMLElement): { width: number; height: number } {
  return {
    width: el.clientWidth || window.innerWidth,
    height: el.clientHeight || window.innerHeight,
  };
}

/* 原版 E()：从 CSS 变量读取 shader 颜色 */
function readShaderColors(el: HTMLElement): { core: Color; fringe: Color } {
  const style = window.getComputedStyle(el);
  const coreStr = style.getPropertyValue("--auth-shader-core").trim() || "#ffffff";
  const fringeStr = style.getPropertyValue("--auth-shader-fringe").trim() || "#4a88ff";
  return { core: new Color(coreStr), fringe: new Color(fringeStr) };
}

let cleanup: (() => void) | null = null;

onMounted(() => {
  const container = webglEl.value;
  if (!container) return;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  const { width, height } = getSize(container);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.domElement.className = "auth-background__canvas";
  container.replaceChildren(renderer.domElement);

  const geometry = new PlaneGeometry(2, 2);
  const { core, fringe } = readShaderColors(container);
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: new Vector2(width, height) },
      u_mouse: { value: new Vector2(0.5, 0.5) },
      u_colorCore: { value: core },
      u_colorFringe: { value: fringe },
      u_isLightMode: { value: 0 },
    },
    transparent: true,
    blending: NormalBlending,
  });
  const mesh = new Mesh(geometry, material);
  const targetMouse = new Vector2(0.5, 0.5);
  const clock = new Clock();
  scene.add(mesh);

  const handleMouseMove = (e: MouseEvent) => {
    targetMouse.x = e.clientX / window.innerWidth;
    targetMouse.y = 1 - e.clientY / window.innerHeight;
  };
  const handleResize = () => {
    const size = getSize(container);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size.width, size.height, false);
    material.uniforms.u_resolution.value = new Vector2(size.width, size.height);
  };

  let frameId = 0;
  const loop = () => {
    frameId = window.requestAnimationFrame(loop);
    material.uniforms.u_time.value = clock.getElapsedTime();
    material.uniforms.u_mouse.value = (material.uniforms.u_mouse.value as Vector2).lerp(
      targetMouse,
      0.05,
    );
    renderer.render(scene, camera);
  };
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("resize", handleResize);
  loop();

  cleanup = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("resize", handleResize);
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    container.replaceChildren();
  };
});

onUnmounted(() => {
  cleanup?.();
  cleanup = null;
});
</script>

<template>
  <div class="auth-background" aria-hidden="true">
    <div ref="webglEl" class="auth-background__webgl" />
    <div class="auth-background__grain" />
    <div class="auth-background__vignette" />
  </div>
</template>

<style scoped>
/* 三层结构与 canvas 样式全部由原版 CSS 提供：
   .auth-background / __webgl / __grain / __vignette / __canvas（assets/original/02-main.css） */
</style>
