/**
 * 认证状态：服务器地址、登录令牌、用户信息（localStorage 持久化）。
 * 仅做状态管理，登录动作在视图层组合 api/auth 完成。
 */
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { FnUser } from "../api/types"

const LS_SERVER = "fnm.serverUrl"
const LS_TOKEN = "fnm.token"
const LS_USER = "fnm.user"

function readLS(key: string): string {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

export const useAuthStore = defineStore("auth", () => {
  const serverUrl = ref(readLS(LS_SERVER) || "")
  const token = ref(readLS(LS_TOKEN))
  const user = ref<FnUser | null>(safeParse(readLS(LS_USER)))

  const isLoggedIn = computed(() => token.value.length > 0)

  function safeParse(raw: string): FnUser | null {
    try {
      return raw ? (JSON.parse(raw) as FnUser) : null
    } catch {
      return null
    }
  }

  function setServer(url: string) {
    serverUrl.value = url.trim().replace(/\/+$/, "")
    localStorage.setItem(LS_SERVER, serverUrl.value)
  }

  function setSession(newToken: string, newUser: FnUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(LS_TOKEN, newToken)
    localStorage.setItem(LS_USER, JSON.stringify(newUser))
  }

  function clearSession() {
    token.value = ""
    user.value = null
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_USER)
  }

  return { serverUrl, token, user, isLoggedIn, setServer, setSession, clearSession }
})
