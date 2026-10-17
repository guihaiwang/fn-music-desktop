<template>
    <div class="aside-content" :class="{ 'is-collapsed': isCollapsed }">
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
        <Scrollbar class="aside-scroll">
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
                <div class="playlist-list">
                    <DropdownMenu v-for="pl in playlists" :key="pl.guid" trigger="contextmenu" stretch
                        :items="contextItems" @before-open="onMenuBeforeOpen(pl)" @select="onContextSelect">
                        <div class="playlist-item"
                            :class="{ 'active': pl.guid == $route.params.playlistId && $route.name == 'home-playlists' }"
                            :title="pl.name" @click="handlePlaylistClick(pl)">
                            <img v-if="pl.coverId && coverUrls[pl.coverId]" class="playlist-cover"
                                :src="coverUrls[pl.coverId]" alt="" loading="lazy" decoding="async" draggable="false" />
                            <Transition name="aside">
                                <span class="playlist-name" v-show="!isCollapsed">{{ pl.name }}</span>
                            </Transition>
                        </div>
                    </DropdownMenu>
                </div>
            </div>
        </Scrollbar>
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
                    v-show="!isCollapsed" :class="{ 'active': $route.name == 'home-settings' }">
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
        <AddPlaylist :open="showAddPlaylist" :edit-playlist="editingPlaylist" @close="onAddClose"
            @created="onPlaylistCreated" @saved="onPlaylistSaved" />
        <ConfirmDialog :open="showDeleteConfirm" title="删除歌单" :description="deleteDescription" confirm-text="删除"
            :loading="deleting" @cancel="showDeleteConfirm = false" @confirm="onDeleteConfirm" />
    </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import HomeIcon from '../assets/iconfont/home.svg?raw'
import FavoriteIcon from '../assets/iconfont/favorite.svg?raw'
import RecentIcon from '../assets/iconfont/recent.svg?raw'
import AlbumsIcon from '../assets/iconfont/albums.svg?raw'
import ArtistsIcon from '../assets/iconfont/artists.svg?raw'
import GenresIcon from '../assets/iconfont/genres.svg?raw'
import LibraryIcon from '../assets/iconfont/library.svg?raw'
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { logout } from '../api/auth'
import { fetchCoverUrl, playlistApi } from '../api/music'
import type { Playlist } from '../api/models'
import { message } from './message/message'
import DropdownMenu, { type DropdownItem } from './DropdownMenu.vue'
import AddPlaylist from './addPlaylist.vue'
import ConfirmDialog from './confirmDialog.vue'
import Scrollbar from './Scrollbar.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const LogoutIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`

const userItems: DropdownItem[] = [
    { key: 'logout', label: '退出登录', icon: LogoutIcon, danger: true },
]

/* ==================== 歌单列表 ==================== */
const playlists = ref<Playlist[]>([])
const playlistsLoading = ref(false)

async function loadPlaylists() {
    if (playlistsLoading.value) return
    playlistsLoading.value = true
    try {
        const resp = await playlistApi.list()
        playlists.value = resp.list
    } catch (e) {
        message.error(e instanceof Error ? e.message : '加载歌单列表失败')
    } finally {
        playlistsLoading.value = false
    }
}

function handlePlaylistClick(pl: Playlist) {
    // TODO: 歌单详情路由就绪后携带 guid 跳转，暂先进入歌单页
    router.push({ name: 'home-playlists', params: { playlistId: pl.guid } })
}

/* ==================== 歌单右键菜单 ==================== */
import playIcon from '../assets/iconfont/play.svg?raw'
import randomIcon from '../assets/iconfont/random.svg?raw'
import listIcon from '../assets/iconfont/list.svg?raw'
import editIcon from '../assets/iconfont/edit.svg?raw'
import deleteIcon from '../assets/iconfont/delete.svg?raw'

/** 右键目标歌单与其歌曲数（null=获取中，前三项禁用） */
const contextPlaylist = ref<Playlist | null>(null)
const contextCount = ref<number | null>(null)

const contextItems = computed<DropdownItem[]>(() => {
    const disabled = contextCount.value === null || contextCount.value === 0
    return [
        { key: 'play', label: '播放', icon: playIcon, disabled },
        { key: 'random', label: '随机播放', icon: randomIcon, disabled },
        { key: 'purge', label: '清除失效歌曲', icon: listIcon, divider: true, disabled },
        { key: 'edit', label: '编辑', icon: editIcon },
        { key: 'delete', label: '删除', icon: deleteIcon },
    ]
})

/** 右键打开菜单前：记录目标并拉取歌曲数量 */
function onMenuBeforeOpen(pl: Playlist) {
    contextPlaylist.value = pl
    contextCount.value = null
    void (async () => {
        try {
            const resp = await playlistApi.batchDetail({ guids: pl.guid })
            if (contextPlaylist.value?.guid === pl.guid) {
                contextCount.value = resp.list[0]?.trackCount ?? 0
            }
        } catch {
            if (contextPlaylist.value?.guid === pl.guid) contextCount.value = 0
        }
    })()
}

function onContextSelect(item: DropdownItem) {
    const pl = contextPlaylist.value
    if (!pl) return
    switch (item.key) {
        case 'play':
            // TODO: 接入播放器后实现
            message.info('播放功能开发中')
            break
        case 'random':
            // TODO: 接入播放器后实现
            message.info('随机播放功能开发中')
            break
        case 'purge':
            void purgeInvalidTracks(pl)
            break
        case 'edit':
            editingPlaylist.value = pl
            showAddPlaylist.value = true
            break
        case 'delete':
            deleteTarget.value = pl
            showDeleteConfirm.value = true
            break
    }
}

/** 清除失效歌曲：先取数量再清除（原版文案带数量） */
async function purgeInvalidTracks(pl: Playlist) {
    try {
        const count = (await playlistApi.purgeTrackCount({ guid: pl.guid }))?.total ?? 0
        await playlistApi.purgeTrack({ guid: pl.guid })
        message.success(count > 0 ? `已清除 ${count} 首失效歌曲` : '没有需要清除的失效歌曲')
    } catch (e) {
        message.error(e instanceof Error ? e.message : '清除失效歌曲失败，请重试')
    }
}

/* ==================== 删除歌单 ==================== */
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Playlist | null>(null)
const deleting = ref(false)

const deleteDescription = computed(() =>
    deleteTarget.value ? `确认删除歌单${deleteTarget.value.name}？此操作将无法恢复。` : '',
)

async function onDeleteConfirm() {
    const pl = deleteTarget.value
    if (!pl || deleting.value) return
    deleting.value = true
    try {
        await playlistApi.delete({ guid: pl.guid })
        message.success('删除歌单成功')
        showDeleteConfirm.value = false
        deleteTarget.value = null
        void loadPlaylists()
        // 删除的是当前打开的歌单时，退回首页
        if (route.params.playlistId === pl.guid) {
            router.push({ name: 'home-index' })
        }
    } catch (e) {
        message.error(e instanceof Error ? e.message : '删除歌单失败，请重试')
    } finally {
        deleting.value = false
    }
}

/* ==================== 新建歌单 ==================== */
const showAddPlaylist = ref(false)
/** 编辑目标：非空时弹窗为编辑模式 */
const editingPlaylist = ref<Playlist | null>(null)

function handleAddPlaylist() {
    editingPlaylist.value = null
    showAddPlaylist.value = true
}

/** 创建成功：重新拉取列表并跳转到新歌单 */
function onPlaylistCreated(playlist: Playlist) {
    void loadPlaylists()
    router.push({ name: 'home-playlists', params: { playlistId: playlist.guid } })
}

/** 编辑保存成功：重新拉取列表 */
function onPlaylistSaved(_playlist: Playlist) {
    void loadPlaylists()
}

function onAddClose() {
    showAddPlaylist.value = false
    editingPlaylist.value = null
}

/** 封面 blob URL 缓存：coverId → objectURL（fetchCoverUrl 内部也有缓存，此处驱动响应式更新） */
const coverUrls = ref<Record<string, string>>({})

/* 歌单就绪后按需拉取封面（无 coverId 或拉取失败时回退占位图标） */
watch(
    playlists,
    (list) => {
        for (const pl of list) {
            const coverId = pl.coverId
            if (!coverId || coverUrls.value[coverId]) continue
            void fetchCoverUrl(coverId).then((url) => {
                if (url) coverUrls.value[coverId] = url
            })
        }
    },
    { immediate: true },
)

onMounted(loadPlaylists)

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
</script>

<style scoped>
/* 滚动区：撑满侧边栏内容宽度（父级 align-items:flex-start 会让它收缩） */
.aside-scroll {
    width: 100%;
}

/* 高度跟随内容（覆盖组件默认 height:100%，双类选择器保证优先级）：
   列表不满一屏时滚动区收缩到内容高度，剩余空白留给 .null 拖拽区；
   列表超长时由 flex 自动压缩出滚动视口，滑块照常工作 */
.aside-content .aside-scroll {
    height: auto;
    flex: 0 1 auto;
    min-height: 0;
}

/* 滑块更细一点，贴合侧边栏的窄场景 */
.aside-content .aside-scroll {
    --fnm-scrollbar-thickness: 6px;
}

/* 关键：给内容预留滑块宽度，滑块只落在预留的留白里，不再压住菜单/歌单/"+"按钮 */
.aside-content :deep(.fnm-scrollbar__wrap) {
    padding-right: 10px;
}

/* 侧边栏不需要横向滑块 */
.aside-content :deep(.fnm-scrollbar__bar.is-horizontal) {
    display: none;
}

/* 收起态：内容本来就窄，直接隐藏滑块（滚轮/触控板照样能滚），并撤掉预留留白 */
.aside-content.is-collapsed :deep(.fnm-scrollbar__bar) {
    display: none;
}

.aside-content.is-collapsed :deep(.fnm-scrollbar__wrap) {
    padding-right: 0;
}

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
        min-height: 0;
        display: flex;
        flex-direction: column;

        .add {
            font-size: 12px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
        }
    }

    .playlist-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .playlist-item {
        width: 100%;
        height: 32px;
        flex: none;
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 10px;
        overflow: hidden;
        border-radius: var(--radius);
        cursor: default;
        user-select: none;
        -webkit-user-select: none;

        &.active {
            background-color: #ffffff14;
        }

        &:hover {
            background-color: #ffffff14;
        }

        .playlist-cover {
            width: 20px;
            height: 20px;
            flex: none;
            border-radius: 4px;
            object-fit: cover;
        }

        .playlist-name {
            font-size: 12px;
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    .bottom {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        width: 100%;
        border-top: 1px solid #ffffff1f;
        padding-top: 10px;
        gap: 10px;
    }

    .button {
        cursor: pointer;
        padding: 10px;
        border-radius: var(--radius);

        &.active {
            background-color: #ffffff14;
        }

        &:hover {
            background-color: #ffffff1f;
        }
    }

    .aside-enter-active,
    .aside-leave-active {
        transition: opacity 0.3s ease;
    }

    .aside-enter-from,
    .aside-leave-to {
        opacity: 0;
    }
}
</style>