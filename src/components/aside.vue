<template>
    <div class="aside-content">
        <div class="user-dd">
            <DropdownMenu stretch :items="userItems" placement="bottom-end" @select="onUserSelect">
                <div class="user" :title="auth.serverName || auth.serverUrl || '未连接服务器'">
                    <img src="../assets/logo.png" alt="飞牛音乐" class="user-avatar" />
                    <Transition name="aside">
                        <div class="user-info" v-show="!isCollapsed">
                            <span class="username">{{ auth.user?.name }}</span>
                            <span class="badge" v-if="auth.isAdmin">管理员</span>
                        </div>
                    </Transition>
                </div>
            </DropdownMenu>
        </div>
        <div class="menus">
            <div class="menu-item" :class="{ 'active': menu.path === $route.name }" v-for="menu in menus"
                :title="menu.title" :key="menu.path" @click="handleClick(menu.path)">
                <span v-html="menu.icon" class="icon"></span>
                <Transition name="aside">
                    <span v-show="!isCollapsed">{{ menu.title }}</span>
                </Transition>
            </div>
        </div>
        <div class="playlist">
            <div class="add">
                <Transition name="aside">
                    <span v-show="!isCollapsed">歌单</span>
                </Transition>
                <div class="button" @click="handleAddPlaylist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="lucide lucide-plus size-3 text-[var(--semi-color-text-0)]" aria-hidden="true">
                        <path d="M5 12h14"></path>
                        <path d="M12 5v14"></path>
                    </svg>
                </div>
            </div>
            <div class="list"></div>
        </div>
        <div class="null" data-tauri-drag-region></div>
        <div class="bottom">
            <div class="collapse button" @click="handleCollapse" :title="isCollapsed ? '展开' : '收起'">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"
                    class="size-4" v-if="!isCollapsed">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M8.293 13.207a1 1 0 010-1.414l5.5-5.5a1 1 0 111.414 1.414L10.414 12.5l4.793 4.793a1 1 0 01-1.414 1.414l-5.5-5.5z">
                    </path>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"
                    class="size-4" v-else>
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M15.457 11.543a1 1 0 010 1.414l-5.5 5.5a1 1 0 01-1.414-1.414l4.793-4.793-4.793-4.793a1 1 0 011.414-1.414l5.5 5.5z">
                    </path>
                </svg>
            </div>
            <Transition name="aside">
                <div class="setting button" @click="$router.push({ name: 'home-settings' })" title="设置"
                    v-show="!isCollapsed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"
                        fill="currentColor" class="size-4">
                        <path fill-rule="evenodd" clip-rule="evenodd"
                            d="M11.998 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm0 2a1.5 1.5 0 10.001 3 1.5 1.5 0 000-3z">
                        </path>
                        <path fill-rule="evenodd" clip-rule="evenodd"
                            d="M15.64 2.216c1.3 0 2.503.688 3.162 1.807L22.4 10.14a3.668 3.668 0 010 3.718l-3.598 6.117a3.668 3.668 0 01-3.161 1.807H8.359c-1.3 0-2.503-.688-3.161-1.807L1.6 13.858a3.668 3.668 0 010-3.718l3.598-6.117a3.669 3.669 0 013.16-1.807h7.283zm-7.281 2c-.59 0-1.137.312-1.437.821l-3.598 6.117a1.667 1.667 0 000 1.69l3.598 6.117c.3.509.846.821 1.437.821h7.282c.59 0 1.137-.312 1.436-.821l3.6-6.117a1.667 1.667 0 000-1.69l-3.6-6.117a1.667 1.667 0 00-1.436-.821H8.359z">
                        </path>
                    </svg>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HomeIcon from '../assets/iconfont/home.svg?raw'
import FavoriteIcon from '../assets/iconfont/favorite.svg?raw'
import RecentIcon from '../assets/iconfont/recent.svg?raw'
import AlbumsIcon from '../assets/iconfont/albums.svg?raw'
import ArtistsIcon from '../assets/iconfont/artists.svg?raw'
import GenresIcon from '../assets/iconfont/genres.svg?raw'
import LibraryIcon from '../assets/iconfont/library.svg?raw'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { logout } from '../api/auth'
import DropdownMenu, { type DropdownItem } from './DropdownMenu.vue'

const router = useRouter()
const auth = useAuthStore()

const LogoutIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`

const userItems: DropdownItem[] = [
    { key: 'logout', label: '退出登录', icon: LogoutIcon, danger: true },
]

async function onUserSelect(item: DropdownItem) {
    if (item.key !== 'logout') return
    try {
        await logout()
    } catch {
        /* 服务端登出失败不阻塞本地清理 */
    }
    auth.clearSession()
    router.replace({ name: 'login' })
}

const menus = [
    { title: "首页", path: 'home-index', icon: HomeIcon },
    { title: "收藏", path: 'home-favorites', icon: FavoriteIcon },
    { title: "最近", path: 'home-recent', icon: RecentIcon },
    { title: '专辑', path: 'home-albums', icon: AlbumsIcon },
    { title: '歌手', path: 'home-artists', icon: ArtistsIcon },
    { title: '风格', path: 'home-genres', icon: GenresIcon },
    { title: "音乐库", path: 'home-library', icon: LibraryIcon },
]
const isCollapsed = ref(false)
const width = ref('220px')

function handleClick(path: string) {
    router.push({ name: path })
}

function handleCollapse() {
    isCollapsed.value = !isCollapsed.value
    if (isCollapsed.value) {
        width.value = '66px'
    } else {
        width.value = '220px'
    }
}
function handleAddPlaylist() { }
</script>

<style scoped>
.aside-content {
    width: v-bind(width);
    height: 100%;
    padding: 30px 15px 15px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 10px;
    box-shadow: inset 0 0 0 1px #ffffff1f;
    transition: width 0.5s cubic-bezier(.4, 0, .2, 1);
    backdrop-filter: blur(44px);
    -webkit-backdrop-filter: blur(44px);

    .null {
        flex: 1 1 auto;
        min-height: 10px;
        width: calc(100% + 30px);
        margin: -10px -15px;
    }

    .user-dd {
        width: 100%;
    }

    .user {
        width: 100%;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 0 3px;
        gap: 10px;
        overflow: hidden;
        cursor: default;
        border-radius: var(--radius);

        &:hover {
            background-color: #ffffff0d;
        }

        .user-avatar {
            width: 30px;
            height: 30px;
            border-radius: var(--radius);
        }

        .user-info {
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            gap: 5px;

            .username {
                font-size: 14px;
                max-width: 110px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .badge {
                padding: 2px 6px;
                width: 50px;
                border-radius: var(--radius);
                background-color: #ffffff1a;
                color: #ffffffcc;
                font-size: 12px;
            }
        }
    }

    .menus {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;

        .menu-item {
            width: 100%;
            height: 36px;
            padding: 0 11px;
            overflow: hidden;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 10px;
            cursor: default;
            user-select: none;
            -webkit-user-select: none;

            &.active {
                background-color: #ffffff14;
            }

            &:hover {
                background-color: #ffffff14;
            }
        }
    }

    .playlist {
        width: 100%;

        .add {
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
        }

        .list {}
    }

    .bottom {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        width: 100%;
        border-top: 1px solid #ffffff1f;
        padding-top: 10px;

    }

    .button {
        cursor: pointer;
        padding: 10px;
        border-radius: var(--radius);

        &:hover {
            background-color: #ffffff1f;
        }
    }

    .aside-enter-active,
    .aside-leave-active {
        transition: opacity 0.4s ease;
    }

    .aside-enter-from,
    .aside-leave-to {
        opacity: 0;
    }
}
</style>