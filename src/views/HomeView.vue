<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import Aside from "../components/aside.vue"
import Play from "../components/play.vue"

const route = useRoute()
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
</script>

<template>
  <div class="container" :class="containerClass">
    <Aside />
    <div class="main">
      <div class="top" v-show="route.name != 'home-settings'">1</div>
      <div class="main-content">
        <router-view />
      </div>
      <div class="play" v-show="route.name != 'home-settings'">
        <Play />
      </div>
    </div>
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

  .main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
    padding: 20px 15px 15px;

    .top {
      height: 45px;
      color: #fff;
      background-color: rgba(0, 0, 0, 0.01);
      border-bottom: 1px solid #ffffff1f;
    }

    .main-content {
      flex: 1 1 auto;
    }

    .play {
      border-top: 1px solid #ffffff1f;
      height: 70px;
    }
  }
}
</style>
