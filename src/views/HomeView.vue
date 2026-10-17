<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import { logout } from "../api/auth"
import Aside from "../components/aside.vue"
import logoUrl from "../assets/logo.png"

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const containerClass = computed(() => {
  switch (route.name) {
    case "home-favorites":
      return "favorites"
    case "home-recent":
      return "recent"
    case "home-genres":
      return "genres"
    case "home-playlists":
      const n = Math.ceil(Math.random() * 4)
      return `event${n}`
    default:
      return "primary"
  }
})

const displayName = computed(() => {
  const u = auth.user as Record<string, unknown> | null
  return (u?.name ?? u?.username ?? u?.nickname ?? "用户") as string
})

async function doLogout() {
  try {
    await logout()
  } catch {
    /* 服务端登出失败不阻塞本地清理 */
  }
  auth.clearSession()
  router.replace({ name: "login" })
}
</script>

<template>
  <div class="container" :class="containerClass">
    <Aside />
    <div class="main">
      <router-view />
    </div>
    <div class="play"></div>
  </div>
</template>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  display: flex;
  color: #fff;
  font-size: 14px;
  transition: opacity .6s;

  &.primary {
    background: var(--bg-gradient-primary);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-overlay);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      pointer-events: none;
    }
  }

  &.favorites {
    background: var(--bg-gradient-likes);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-overlay);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      pointer-events: none;
    }
  }

  &.recent {
    background: var(--bg-gradient-recent);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-overlay);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      pointer-events: none;
    }
  }

  &.genres {
    background: var(--bg-gradient-primary);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-playlists), var(--bg-gradient-genres);
      backdrop-filter: blur(58px);
      -webkit-backdrop-filter: blur(58px);
      opacity: 0.95;
      transition: opacity 1.3s cubic-bezier(0.2, 0.9, 0.22, 1);
      pointer-events: none;
    }
  }


  &.event1 {
    background: var(--bg-gradient-primary);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-playlists), var(--bg-gradient-event1);
      backdrop-filter: blur(58px);
      -webkit-backdrop-filter: blur(58px);
      opacity: 0.95;
      transition: opacity 1.3s cubic-bezier(0.2, 0.9, 0.22, 1);
      pointer-events: none;
    }
  }

  &.event2 {
    background: var(--bg-gradient-primary);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-playlists), var(--bg-gradient-event2);
      backdrop-filter: blur(58px);
      -webkit-backdrop-filter: blur(58px);
      opacity: 0.95;
      transition: opacity 1.3s cubic-bezier(0.2, 0.9, 0.22, 1);
      pointer-events: none;
    }
  }

  &.event3 {
    background: var(--bg-gradient-primary);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-playlists), var(--bg-gradient-event3);
      backdrop-filter: blur(58px);
      -webkit-backdrop-filter: blur(58px);
      opacity: 0.95;
      transition: opacity 1.3s cubic-bezier(0.2, 0.9, 0.22, 1);
      pointer-events: none;
    }
  }

  &.event4 {
    background: var(--bg-gradient-primary);

    &::before {
      content: '';
      position: absolute;
      z-index: 0;
      inset: 0;
      background: var(--bg-gradient-playlists), var(--bg-gradient-event4);
      backdrop-filter: blur(58px);
      -webkit-backdrop-filter: blur(58px);
      opacity: 0.95;
      transition: opacity 1.3s cubic-bezier(0.2, 0.9, 0.22, 1);
      pointer-events: none;
    }
  }

}
</style>
