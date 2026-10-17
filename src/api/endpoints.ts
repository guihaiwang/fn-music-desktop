/**
 * 飞牛音乐 API 路由表 —— 1:1 还原原版 web bundle（5e884898... chunk 中的 q 对象）。
 *
 * 请求方式速查（原版 vy/by/Sy/... 各 method 表）：
 *   GET  album.list / album.artistDetailList / album.detail
 *   GET  appCenter.authedDirList / appCenter.authedDirSubList；POST authedDirSubCreate
 *   POST artist.create；GET artist.list / artist.listAll / artist.detail
 *   GET  sys.config；GET initialization.state；POST initialization.prepare / confirm
 *   POST user.authLogin / user.passwordLogin；GET user.me；POST user.logout
 *   POST event.report
 *   GET  favoriteTrack.list / purgeTrackCount；POST create / delete / purgeTrack
 *   POST genre.create；GET genre.list / genre.detail；GET track.genreDetailList
 *   GET  lyric.list
 *   GET  playHistory.list；POST playHistory.delete
 *   GET  playlist.list / batchDetail / detail / purgeTrackCount；POST create / edit /
 *        delete / addTrack / removeTrack / purgeTrack；POST static.cover.playlist（传封面）
 *   GET  search.track / album / artist / playlist / suggest；POST search.indexRebuild
 *   GET  settings.user.detail / settings.server.detail；POST settings.user.update / server.update
 *   GET  sharedLibrary.list / detail；POST reconnectCheck / reconnect / create / edit /
 *        delete / scan / scanAll
 *   GET  task.list；POST task.cancel / task.delete / task.retry
 *   GET  track.list / albumDetailList / artistDetailList / genreDetailList /
 *        playlistDetailList / roamStart / roamNext / roamPrevious / metadata；
 *   POST track.metadata（编辑） / track.transcode / transcodeHeartbeat / transcodeQuit；
 *   POST static.cover.track（传封面）
 *   GET  user.list / user.exists；POST user.create / edit / passwdChange / delete / unbanned
 *
 * 静态资源（非 JSON，URL 拼接 + Cookie 鉴权，见 music.ts 的 build*Url）：
 *   GET /static/cover?coverId=&size=     封面（size: 0/160/600/1024/1600/2000）
 *   GET /track/stream?guid=              音频流
 *   GET /track/hls/:guid/preset.m3u8     HLS
 */
export const API_ROUTES = {
  album: {
    artistDetailList: "/album/artist-detail/list",
    detail: "/album/detail",
    list: "/album/list",
  },
  appCenter: {
    authedDirList: "/app-center/authed-dir/list",
    authedDirSubCreate: "/app-center/authed-dir/sub/create",
    authedDirSubList: "/app-center/authed-dir/sub/list",
  },
  artist: {
    create: "/artist/create",
    detail: "/artist/detail",
    list: "/artist/list",
    listAll: "/artist/list-all",
  },
  event: {
    report: "/event/report",
  },
  favoriteTrack: {
    create: "/favorite-track/create",
    delete: "/favorite-track/delete",
    list: "/favorite-track/list",
    purgeTrack: "/favorite-track/purge-track",
    purgeTrackCount: "/favorite-track/purge-track-count",
  },
  genre: {
    create: "/genre/create",
    detail: "/genre/detail",
    list: "/genre/list",
  },
  initialization: {
    confirm: "/initialization/confirm",
    prepare: "/initialization/prepare",
    state: "/initialization/state",
  },
  lyric: {
    list: "/lyric/list",
  },
  playHistory: {
    delete: "/play-history/delete",
    list: "/play-history/list",
  },
  playlist: {
    addTrack: "/playlist/add-track",
    batchDetail: "/playlist/batch-detail",
    create: "/playlist/create",
    delete: "/playlist/delete",
    detail: "/playlist/detail",
    edit: "/playlist/edit",
    list: "/playlist/list",
    purgeTrack: "/playlist/purge-track",
    purgeTrackCount: "/playlist/purge-track-count",
    removeTrack: "/playlist/remove-track",
  },
  search: {
    album: "/search/album",
    artist: "/search/artist",
    indexRebuild: "/search/index/rebuild",
    playlist: "/search/playlist",
    suggest: "/search/suggest",
    track: "/search/track",
  },
  settings: {
    server: {
      detail: "/settings/server",
      update: "/settings/server",
    },
    user: {
      detail: "/settings/user",
      update: "/settings/user",
    },
  },
  sharedLibrary: {
    create: "/shared-library/create",
    delete: "/shared-library/delete",
    detail: "/shared-library/detail",
    edit: "/shared-library/edit",
    list: "/shared-library/list",
    reconnect: "/shared-library/reconnect",
    reconnectCheck: "/shared-library/reconnect/check",
    scan: "/shared-library/scan",
    scanAll: "/shared-library/scan-all",
  },
  static: {
    cover: "/static/cover",
    playlistCover: "/static/cover/playlist",
    trackCover: "/static/cover/track",
  },
  sys: {
    config: "/sys/config",
  },
  task: {
    cancel: "/task/cancel",
    delete: "/task/delete",
    list: "/task/list",
    retry: "/task/retry",
  },
  track: {
    albumDetailList: "/track/album-detail/list",
    artistDetailList: "/track/artist-detail/list",
    genreDetailList: "/track/genre-detail/list",
    /** HLS 播放列表（:guid 替换为曲目 guid） */
    hlsPreset: "/track/hls/:guid/preset.m3u8",
    list: "/track/list",
    metadata: "/track/metadata",
    playlistDetailList: "/track/playlist-detail/list",
    roamStart: "/track/roam-start",
    roamNext: "/track/roam-next",
    roamPrevious: "/track/roam-previous",
    stream: "/track/stream",
    transcode: "/track/transcode",
    transcodeHeartbeat: "/track/transcode/heartbeat",
    transcodeQuit: "/track/transcode/quit",
  },
  user: {
    authLogin: "/user/auth-login",
    create: "/user/create",
    delete: "/user/delete",
    edit: "/user/edit",
    exists: "/user/exists",
    list: "/user/list",
    logout: "/user/logout",
    me: "/user/me",
    passwdChange: "/user/passwd-change",
    passwordLogin: "/user/password-login",
    unbanned: "/user/unbanned",
  },
} as const;
