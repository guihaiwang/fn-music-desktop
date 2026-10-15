<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import { authLogin, buildNasOauthUrl, getSysConfig, passwordLogin } from "../api/auth"
import { getDeviceId } from "../utils/device"
import AuthBackground from "../components/AuthBackground.vue"
import appIconUrl from "../assets/logo.png"
import introDiscUrl from "../assets/intro-disc.png"

/* ============ 原版常量（bdf49 chunk 的 de hook） ============ */
const GENRES = ["Pop", "Rock", "Electronic", "Hip-Hop", "R&B", "Jazz", "Folk", "Country", "Classical"]
const PREFIX = "Music     =     "
const FRAME_COUNT = 8
const FRAME_INTERVAL = 150 // ce：图标帧速
const WORD_HOLD = 1400 // le：整词停留
const TYPE_INTERVAL = 60 // ue：打字速度
const INITIAL_DELAY = 900 // k：启动延迟
const ICON_SHOW = 2400 // 图标动画展示时长
const WORD_SWITCH_GAP = 200 // 轮换间隔
const INTRO_EXIT_AT = 850
const INTRO_DONE_AT = 1850

const scanFrames = import.meta.glob("../assets/scan-frames/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>
const frameUrls = Array.from({ length: FRAME_COUNT }, (_, i) => scanFrames[`../assets/scan-frames/${i + 1}.svg`])

/* ============ 原版 fe：开屏相位 entering → exiting(850ms) → done(1850ms) ============ */
const introPhase = ref<"entering" | "exiting" | "done">("entering")
let introTimers: number[] = []

/* ============ 原版 de：打字机状态机 ============ */
const tw = ref({ pre: `${PREFIX}${GENRES[0]}`, post: "", showCursor: false, iconFrame: 1 })
let frameTimer: number | null = null

function startTypewriter() {
  let word = 0
  let frame = 1
  const stopFrames = () => {
    if (frameTimer !== null) {
      window.clearInterval(frameTimer)
      frameTimer = null
    }
    frame = 1
    tw.value = { ...tw.value, iconFrame: 1 }
  }
  const startFrames = () => {
    if (frameTimer === null) {
      frameTimer = window.setInterval(() => {
        frame = (frame % FRAME_COUNT) + 1
        tw.value = { ...tw.value, iconFrame: frame }
      }, FRAME_INTERVAL)
    }
  }
  const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

    ; (async () => {
      await sleep(INITIAL_DELAY)
      for (; ;) {
        const cur = `${PREFIX}${GENRES[word]}`
        const next = `${PREFIX}${GENRES[(word + 1) % GENRES.length]}`
        tw.value = { pre: cur, post: "", showCursor: false, iconFrame: frame }
        await sleep(WORD_HOLD)
        startFrames()
        await sleep(ICON_SHOW)
        stopFrames()
        const max = Math.max(cur.length, next.length)
        for (let i = 0; i <= max; i++) {
          tw.value = { pre: next.slice(0, i), post: cur.slice(i + 1), showCursor: i < max, iconFrame: frame }
          await sleep(TYPE_INTERVAL)
        }
        stopFrames()
        word = (word + 1) % GENRES.length
        tw.value = { pre: next, post: "", showCursor: false, iconFrame: 1 }
        await sleep(WORD_SWITCH_GAP)
      }
    })()
}

/* ============ 登录状态 ============ */
const router = useRouter()
const auth = useAuthStore()

const serverInput = ref(auth.serverUrl)
const username = ref(localStorage.getItem("fnm.username") ?? "")
const password = ref("")
const rememberMe = ref(true)
const showPassword = ref(false)

const submitting = ref(false)
const ssoWaiting = ref(false)
const errorMsg = ref("")
const showForgot = ref(false)

let unlistenSso: UnlistenFn | null = null
let unlistenSsoClosed: UnlistenFn | null = null

function ensureServer(): boolean {
  const raw = serverInput.value.trim()
  const normalized = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
  try {
    const u = new URL(normalized)
    if (!u.hostname) throw new Error("bad host")
    auth.setServer(normalized)
    return true
  } catch {
    errorMsg.value = "服务器地址无效，请检查（例如 http://192.168.1.125:5666）"
    return false
  }
}

async function checkServer() {
  if (!ensureServer()) return
  try {
    await getSysConfig()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  }
}

/** 用户名密码登录 */
async function submitPasswordLogin() {
  if (submitting.value) return
  if (!ensureServer()) return
  if (!username.value.trim() || !password.value) {
    errorMsg.value = "请输入用户名和密码"
    return
  }
  submitting.value = true
  errorMsg.value = ""
  try {
    const result = await passwordLogin(username.value.trim(), password.value, getDeviceId())
    if (rememberMe.value) localStorage.setItem("fnm.username", username.value.trim())
    auth.setSession(result.userToken, result.user)
    router.replace({ name: "home" })
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}

/** 使用 NAS 账号登录（SSO，应用内授权窗口） */
async function startNasLogin() {
  if (ssoWaiting.value) return
  if (!ensureServer()) return
  errorMsg.value = ""
  try {
    const url = await buildNasOauthUrl()
    await invoke("open_sso_login", { url })
    ssoWaiting.value = true
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  }
}

function cancelNasLogin() {
  ssoWaiting.value = false
  errorMsg.value = ""
  void invoke("close_sso_login").catch(() => { })
}

/** 处理 Rust 端拦截到的 SSO 授权码 */
async function handleSsoCode(code: string) {
  ssoWaiting.value = false
  try {
    const result = await authLogin(code, getDeviceId())
    if (rememberMe.value && username.value.trim()) {
      localStorage.setItem("fnm.username", username.value.trim())
    }
    auth.setSession(result.userToken, result.user)
    router.replace({ name: "home" })
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(async () => {
  void checkServer()
  // SSO 事件仅在 Tauri 环境可用；纯浏览器预览（vite dev 直开）时忽略
  try {
    unlistenSso = await listen<string>("sso:code", (event) => {
      void handleSsoCode(event.payload)
    })
    // SSO 窗口被关闭（含未登录成功的手动关闭）时取消等待态
    unlistenSsoClosed = await listen("sso:closed", () => {
      ssoWaiting.value = false
    })
  } catch {
    unlistenSso = null
    unlistenSsoClosed = null
  }

  // 开屏相位（原版 fe）
  introTimers = [
    window.setTimeout(() => (introPhase.value = "exiting"), INTRO_EXIT_AT),
    window.setTimeout(() => (introPhase.value = "done"), INTRO_DONE_AT),
  ]
  // 打字机（原版 de：isPageReady 后启动）
  const readyTimer = window.setTimeout(() => startTypewriter(), INTRO_DONE_AT)
  introTimers.push(readyTimer)
})

onUnmounted(() => {
  unlistenSso?.()
  unlistenSsoClosed?.()
  introTimers.forEach((t) => window.clearTimeout(t))
  if (frameTimer !== null) window.clearInterval(frameTimer)
})
</script>

<template>
  <!-- DOM 结构对齐原版 /login（1bc04 chunk 的 sL 组件树） -->
  <div class="auth-page semi-always-dark" :class="{ 'auth-page--ready': introPhase === 'done' }">
    <!-- 开屏动画（原版 rI）：ripple + 唱片 -->
    <div v-if="introPhase !== 'done'" class="auth-intro" :class="`auth-intro--${introPhase}`" aria-hidden="true">
      <div class="auth-intro__ripple">
        <span />
        <span />
        <span />
      </div>
      <div class="auth-intro__content" :class="introPhase === 'entering' ? 'is-in' : 'is-out'">
        <div class="auth-intro__disc-wrap">
          <span class="auth-intro__disc-frame">
            <img class="auth-intro__disc" :src="introDiscUrl" alt="" />
          </span>
        </div>
      </div>
    </div>

    <!-- WebGL 背景（原版 _I） -->
    <AuthBackground />

    <!-- 技术装饰标签 + 打字机（原版 PI/NI） -->
    <div class="auth-tech-label auth-tech-label--top-left auth-reveal" data-reveal-order="1">
      PERSONAL MUSIC ARCHIVE
    </div>
    <div class="auth-tech-label auth-tech-label--bottom-left auth-reveal" data-reveal-order="2">
      TRACKS // ALBUMS // ARTISTS
    </div>
    <div class="auth-tech-label auth-tech-label--vertical-right auth-reveal" data-reveal-order="3">
      <span class="auth-genre-slot">
        <img :src="frameUrls[(tw.iconFrame || 1) - 1]" class="auth-genre-icon" alt="" />
        <span class="auth-genre-text-fixed">
          <span>{{ tw.pre }}</span>
          <span class="auth-genre-cursor" :style="{ display: tw.showCursor ? 'inline' : 'none' }">▊</span>
          <span>{{ tw.post }}</span>
        </span>
      </span>
    </div>

    <!-- 登录面板（原版 rL） -->
    <div class="auth-layout">
      <div class="auth-wrapper">
        <main class="auth-panel auth-reveal" data-reveal-order="4">
          <div class="auth-flow-card flex flex-col gap-10">
            <!-- 面板头部（原版 tL）：App 图标 + 飞牛音乐 -->
            <header class="auth-panel-header">
              <img :src="appIconUrl" class="auth-panel-logo" alt="" />
              <div class="auth-panel-heading">
                <h1 class="auth-panel-title">飞牛音乐</h1>
              </div>
            </header>

            <p v-if="errorMsg" class="auth-panel-error" role="alert">{{ errorMsg }}</p>

            <form class="auth-login-form auth-form-stack" @submit.prevent="submitPasswordLogin">
              <div class="auth-form-group auth-reveal">
                <div class="auth-input-wrapper auth-input-wrapper--server">
                  <label for="server">服务器地址</label>
                  <input id="server" v-model="serverInput" type="text" placeholder="http://192.168.1.125:5666"
                    spellcheck="false" autocomplete="url" @change="checkServer" />
                </div>
                <div class="auth-input-wrapper">
                  <label for="username">用户名</label>
                  <input id="username" v-model="username" type="text" placeholder="请输入用户名" autocomplete="username" />
                </div>
                <div class="auth-input-wrapper auth-input-wrapper--password">
                  <label for="password">密码</label>
                  <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码"
                    autocomplete="current-password" />
                  <button class="password-toggle" type="button" tabindex="-1"
                    :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                        stroke="currentColor" stroke-width="1.7" />
                      <circle v-if="!showPassword" cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" />
                      <path v-if="!showPassword" d="M14.8 9.2a3 3 0 0 1-3.6 3.6" stroke="currentColor"
                        stroke-width="1.7" />
                      <circle v-else cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" />
                      <path v-if="showPassword" d="M4 20 20 4" stroke="currentColor" stroke-width="1.7"
                        stroke-linecap="round" />
                    </svg>
                  </button>
                </div>

                <div class="auth-form-extras">
                  <label class="auth-remember-me">
                    <input v-model="rememberMe" type="checkbox" />
                    <span class="auth-checkbox-box" :class="{ checked: rememberMe }">
                      <svg class="auth-checkbox-icon auth-checkbox-icon--checked" viewBox="0 0 18 18" width="18"
                        height="18" aria-hidden="true">
                        <rect x="0.5" y="0.5" width="17" height="17" rx="5" fill="#fff" />
                        <path d="M5 9.2 8 12 13 6" fill="none" stroke="#0f0f0f" stroke-width="2" stroke-linecap="round"
                          stroke-linejoin="round" />
                      </svg>
                      <svg class="auth-checkbox-icon auth-checkbox-icon--unchecked" viewBox="0 0 18 18" width="18"
                        height="18" aria-hidden="true">
                        <rect x="1.25" y="1.25" width="15.5" height="15.5" rx="4.5" fill="none" stroke="currentColor"
                          stroke-width="1.5" />
                      </svg>
                    </span>
                    <span class="auth-remember-text">记住账号</span>
                  </label>
                  <span class="auth-forgot-link" @click="showForgot = true">忘记密码？</span>
                </div>
              </div>

              <!-- 底部双按钮并排（原版 auth-bottom-actions 两列 grid） -->
              <div class="auth-bottom-actions auth-reveal">
                <button class="auth-button auth-button--secondary" type="button" :disabled="ssoWaiting"
                  @click="startNasLogin">
                  使用 NAS 登录
                </button>
                <button class="auth-button auth-button--primary" type="submit" :disabled="submitting">
                  {{ submitting ? "登录中..." : "登录" }}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>

    <!-- 忘记密码弹窗（原版 auth-forgot-dialog） -->
    <transition name="fade">
      <div v-if="showForgot" class="auth-forgot-dialog-layer" @click.self="showForgot = false">
        <div class="auth-forgot-dialog">
          <div class="auth-forgot-dialog-icon">
            <!-- 锁体（原版 lock-body 50.3×53.5） -->
            <svg class="auth-forgot-dialog-lock-body" viewBox="0 0 51 54" fill="none" aria-hidden="true">
              <path d="M14 22v-6a11.5 11.5 0 0 1 23 0v6" stroke="currentColor" stroke-width="4"
                stroke-linecap="round" />
              <rect x="4" y="21" width="43" height="33" rx="9" fill="currentColor" />
            </svg>
            <!-- 锁点（原版 lock-dots 28×28） -->
            <svg class="auth-forgot-dialog-lock-dots" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="6" cy="14" r="4" fill="currentColor" />
              <circle cx="14" cy="14" r="4" fill="currentColor" />
              <circle cx="22" cy="14" r="4" fill="currentColor" />
            </svg>
          </div>
          <div class="auth-forgot-dialog-copy">
            <h2>忘记密码？</h2>
            <p>如果您是 NAS 用户，请尝试 NAS 帐号登录；</p>
            <p>请联系管理员修改密码。</p>
          </div>
          <button class="auth-forgot-dialog-button" type="button" @click="showForgot = false">确认</button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="ssoWaiting" class="sso-overlay">
        <span class="spinner" aria-hidden="true" />
        <p>已打开 NAS 登录窗口</p>
        <p class="sub">请在授权窗口中完成登录，成功后自动返回</p>
        <button class="auth-button auth-button--secondary sso-cancel" type="button" @click="cancelNasLogin">
          取消
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* auth 主体样式全部由原版 CSS 提供；此处仅补充原版 CSS 未覆盖的桌面端实现细节 */

/* 面板头部（原版 tL：header h-[90px] flex items-start gap-4 + 44px 标题 + 20px serverName） */
.auth-panel-header {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  height: 90px;
}

.auth-panel-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex: none;
  border-radius: 14px;
}

.auth-panel-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  height: 100%;
  flex-direction: column;
  justify-content: center;
}

.auth-panel-title {
  margin: 0;
  font-size: 44px;
  line-height: 54px;
  font-weight: 700;
  letter-spacing: -1.76px;
  color: var(--auth-text-primary, rgba(255, 255, 255, 0.92));
}

/* 忘记密码弹窗（原版 auth-forgot-dialog 类；图标颜色继承自 dialog 文本色） */
.auth-forgot-dialog-icon {
  color: var(--auth-text-primary, rgba(255, 255, 255, 0.92));
}

/* 密码可见切换（原版为 semi Input modebtn） */
.auth-input-wrapper--password {
  position: relative;
}

.auth-input-wrapper--password input {
  padding-right: 56px;
}

.password-toggle {
  position: absolute;
  right: 16px;
  bottom: 19px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--ds-text-secondary, rgba(255, 255, 255, 0.62));
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--ds-text-primary, rgba(255, 255, 255, 0.92));
}

/* 忘记密码（原版 auth-forgot-link） */
.auth-forgot-link {
  font-size: 13px;
  color: var(--ds-text-secondary, rgba(255, 255, 255, 0.62));
  cursor: pointer;
}

.auth-forgot-link:hover {
  color: var(--ds-text-primary, rgba(255, 255, 255, 0.92));
}

/* 原生 checkbox 隐藏（原版以图标切换呈现状态） */
.auth-remember-me {
  position: relative;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  display: inline-flex;
  -webkit-user-select: none;
  user-select: none;
}

.auth-remember-me input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.auth-checkbox-box {
  position: relative;
}

.auth-checkbox-icon--checked {
  display: none;
}

.auth-remember-me input:checked+.auth-checkbox-box .auth-checkbox-icon--checked {
  display: block;
}

.auth-remember-me input:checked+.auth-checkbox-box .auth-checkbox-icon--unchecked {
  display: none;
}

.auth-remember-text {
  font-size: 14px;
  color: var(--ds-text-secondary, rgba(255, 255, 255, 0.62));
}

/* SSO 等待遮罩（桌面端交互，原版无对应元素） */
.sso-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px;
  text-align: center;
  background: rgba(15, 15, 15, 0.82);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.sso-overlay p {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: rgba(255, 255, 255, 0.92);
}

.sso-overlay .sub {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.62);
}

.sso-cancel {
  width: auto;
  min-width: 180px;
  margin-top: 20px;
}

.spinner {
  width: 30px;
  height: 30px;
  margin-bottom: 12px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
