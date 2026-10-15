<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { logout } from "../api/auth";
import logoUrl from "../assets/logo.png";

const router = useRouter();
const auth = useAuthStore();

const displayName = computed(() => {
  const u = auth.user as Record<string, unknown> | null;
  return (u?.name ?? u?.username ?? u?.nickname ?? "用户") as string;
});

async function doLogout() {
  try {
    await logout();
  } catch {
    /* 服务端登出失败不阻塞本地清理 */
  }
  auth.clearSession();
  router.replace({ name: "login" });
}
</script>

<template>
  <div class="home-page">
    <main class="panel">
      <img class="logo" :src="logoUrl" alt="飞牛音乐" />
      <h1>登录成功</h1>
      <p class="welcome">欢迎，{{ displayName }}</p>
      <ul class="meta">
        <li><span>服务器地址</span><b>{{ auth.serverUrl }}</b></li>
        <li><span>登录状态</span><b>已连接</b></li>
      </ul>
      <p class="tip">音乐库浏览、播放等功能将在后续迭代中实现。</p>
      <button class="btn" type="button" @click="doLogout">退出登录</button>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--ds-bg-primary);
  overflow: hidden;
}
.panel {
  width: 460px;
  max-width: calc(100vw - 48px);
  padding: 40px 36px;
  text-align: center;
  border-radius: 18px;
  background: var(--ds-bg-button-primary);
  border: 1px solid rgba(255, 255, 255, 0.09);
}
.logo {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  margin-bottom: 14px;
}
h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.welcome {
  margin: 8px 0 22px;
  color: var(--ds-text-secondary);
  font-size: 14px;
}
.meta {
  list-style: none;
  margin: 0 0 20px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  text-align: left;
  font-size: 13px;
}
.meta li {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}
.meta span {
  color: var(--ds-text-secondary);
}
.meta b {
  font-weight: 500;
  color: var(--ds-text-primary);
  word-break: break-all;
}
.tip {
  margin: 0 0 22px;
  font-size: 12.5px;
  color: var(--ds-text-quaternary);
}
.btn {
  padding: 10px 34px;
  border-radius: 16px;
  border: 0;
  background: var(--ds-bg-button-primary);
  color: var(--ds-text-primary);
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}
.btn:hover {
  background: var(--ds-bg-button-primary-hover);
}
</style>
