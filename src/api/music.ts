/**
 * 飞牛音乐 API 全量端点封装 —— 对应原版 web 客户端 Xy 类的各接口组。
 *
 * - 路由表见 endpoints.ts；数据类型见 models.ts
 * - GET 请求参数走 query（authx 签名自动处理），POST 走 JSON body
 * - 所有响应已被 http.ts 解包（code!==0 时抛 ApiError），此处返回的即 data
 * - 请求选项：fallbackMessage 等原版参数桌面端不涉及；需要中断用 opts.timeoutMs
 */
import { apiRequest } from "./http";
import type {
  Album,
  AlbumDetail,
  Artist,
  AudioSpec,
  AuthedSubDir,
  InitializationConfirmRequest,
  InitializationPrepareResponse,
  InitializationState,
  CoverUploadResponse,
  EntityRef,
  EventReportRequest,
  Genre,
  LyricListResponse,
  MusicUser,
  NasAuthedDir,
  PagedRequest,
  PagedResponse,
  Playlist,
  PlaylistTrackCount,
  RoamResponse,
  RoamStartResponse,
  SearchResponse,
  SearchSuggestResponse,
  ServerSettings,
  SharedLibrary,
  SortParam,
  Task,
  Track,
  TrackMetadata,
  TrackMetadataUpdateRequest,
  TranscodeOutput,
  TranscodeQuality,
  TranscodeResponse,
  UserCreateRequest,
  UserEditRequest,
  UserExistsResponse,
  UserSettings,
} from "./models";
import { API_ROUTES as R } from "./endpoints";

/** 排序参数序列化：{field, order} → "field,order"（原版 Ri() 行为） */
export function serializeSort(sort?: SortParam): string | undefined {
  return sort ? `${sort.field},${sort.order}` : undefined;
}

/** 分页请求 → query（sort 序列化为字符串） */
function pagedQuery(req: PagedRequest): Record<string, string | number> {
  const q: Record<string, string | number> = { page: req.page, size: req.size };
  const sort = serializeSort(req.sort);
  if (sort) q.sort = sort;
  return q;
}

/**
 * 服务端列表响应兼容处理：部分列表接口（task/user/shared-library 等）
 * 可能返回裸数组或 { list: [...] }（原版 oM/gt/We 的归一化行为）。
 */
function normalizeList<T>(resp: T[] | { list?: T[] } | null | undefined): T[] {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray((resp as { list?: T[] }).list)) {
    return (resp as { list: T[] }).list;
  }
  return [];
}

/* ==================== 专辑 /album ==================== */

export const albumApi = {
  /** GET /album/list —— 全库专辑分页；sort 字段：newTrackAddedAt / title 等 */
  list(req: PagedRequest): Promise<PagedResponse<Album>> {
    return apiRequest("GET", R.album.list, undefined, { query: pagedQuery(req) });
  },

  /** GET /album/artist-detail/list —— 指定歌手的专辑；sort：title / trackCount / newTrackAddedAt */
  artistDetailList(req: {
    artistGUID: string;
    page: number;
    size: number;
    sort?: SortParam;
  }): Promise<PagedResponse<Album>> {
    return apiRequest("GET", R.album.artistDetailList, undefined, {
      query: {
        artistGUID: req.artistGUID,
        page: req.page,
        size: req.size,
        ...(req.sort ? { sort: serializeSort(req.sort)! } : {}),
      },
    });
  },

  /** GET /album/detail —— 专辑详情（当前服务端返回裸专辑；web 兼容 { album, tracks } 包裹） */
  detail(req: { guid: string }): Promise<AlbumDetail> {
    return apiRequest("GET", R.album.detail, undefined, { query: { guid: req.guid } });
  },
};

/* ==================== NAS 授权目录 /app-center ==================== */

export const appCenterApi = {
  /** GET /app-center/authed-dir/list —— fnOS 授权给音乐应用的目录 */
  async authedDirList(): Promise<NasAuthedDir[]> {
    const resp = await apiRequest<{ list: NasAuthedDir[] }>("GET", R.appCenter.authedDirList);
    return normalizeList(resp);
  },

  /** GET /app-center/authed-dir/sub/list —— 指定父目录的子目录 */
  async authedDirSubList(req: { parent: string }): Promise<AuthedSubDir[]> {
    const resp = await apiRequest<{ list: AuthedSubDir[] }>("GET", R.appCenter.authedDirSubList, undefined, {
      query: { parent: req.parent },
    });
    return normalizeList(resp);
  },

  /** POST /app-center/authed-dir/sub/create —— 创建授权子目录（web UI 未使用，请求体按惯例推断） */
  authedDirSubCreate(req: { parent: string; name: string }): Promise<unknown> {
    return apiRequest("POST", R.appCenter.authedDirSubCreate, req);
  },
};

/* ==================== 歌手 /artist ==================== */

export const artistApi = {
  /** POST /artist/create —— 创建歌手 */
  create(req: { name: string }): Promise<Artist> {
    return apiRequest("POST", R.artist.create, req);
  },

  /** GET /artist/list —— 歌手分页；sort：name / trackCount / albumCount 等 */
  list(req: PagedRequest): Promise<PagedResponse<Artist>> {
    return apiRequest("GET", R.artist.list, undefined, { query: pagedQuery(req) });
  },

  /** GET /artist/list-all —— 全部歌手（不分页） */
  async listAll(req: { lang?: string } = {}): Promise<{ list: Artist[] }> {
    const list = await apiRequest<{ list: Artist[] }>("GET", R.artist.listAll, undefined, {
      query: req.lang ? { lang: req.lang } : undefined,
    });
    return { list: normalizeList(list) };
  },

  /** GET /artist/detail —— 歌手详情 */
  detail(req: { guid: string }): Promise<Artist> {
    return apiRequest("GET", R.artist.detail, undefined, { query: { guid: req.guid } });
  },

  /** GET /album/artist-detail/list —— 歌手专辑分页 */
  albums(req: { artistGUID: string; page: number; size: number; sort?: SortParam }): Promise<PagedResponse<Album>> {
    return albumApi.artistDetailList(req);
  },

  /** GET /track/artist-detail/list —— 歌手曲目分页；sort：trackNo / title 等 */
  tracks(req: { artistGUID: string; page: number; size: number; sort?: SortParam }): Promise<PagedResponse<Track>> {
    return trackApi.artistDetailList(req);
  },
};

/* ==================== 事件上报 /event ==================== */

export const eventApi = {
  /** POST /event/report —— 播放历史/歌词偏移埋点（web 端 TrackPlay 也走 sendBeacon） */
  report(req: EventReportRequest): Promise<null> {
    return apiRequest("POST", R.event.report, req);
  },
};

/* ==================== 收藏 /favorite-track ==================== */

export const favoriteTrackApi = {
  /** GET /favorite-track/list —— 收藏曲目分页；sort 字段：favoriteAt */
  list(req: PagedRequest): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.favoriteTrack.list, undefined, { query: pagedQuery(req) });
  },

  /** POST /favorite-track/create —— 收藏曲目 */
  create(req: { trackGUID: string }): Promise<null> {
    return apiRequest("POST", R.favoriteTrack.create, req);
  },

  /** POST /favorite-track/delete —— 取消收藏 */
  delete(req: { trackGUID: string }): Promise<null> {
    return apiRequest("POST", R.favoriteTrack.delete, req);
  },

  /** GET /favorite-track/purge-track-count —— 失效收藏数量 */
  purgeTrackCount(): Promise<{ total: number }> {
    return apiRequest("GET", R.favoriteTrack.purgeTrackCount);
  },

  /** POST /favorite-track/purge-track —— 清除全部失效收藏 */
  purgeTrack(): Promise<null> {
    return apiRequest("POST", R.favoriteTrack.purgeTrack);
  },
};

/* ==================== 流派 /genre ==================== */

export const genreApi = {
  /** POST /genre/create —— 创建流派 */
  create(req: { name: string }): Promise<Genre> {
    return apiRequest("POST", R.genre.create, req);
  },

  /** GET /genre/list —— 流派分页；sort 字段：name / trackCount */
  list(req: PagedRequest): Promise<PagedResponse<Genre>> {
    return apiRequest("GET", R.genre.list, undefined, { query: pagedQuery(req) });
  },

  /** GET /genre/detail —— 流派详情 */
  detail(req: { guid: string }): Promise<Genre> {
    return apiRequest("GET", R.genre.detail, undefined, { query: { guid: req.guid } });
  },

  /** GET /track/genre-detail/list —— 流派下曲目分页 */
  tracks(req: { genreGUID: string; page: number; size: number; sort?: SortParam }): Promise<PagedResponse<Track>> {
    return trackApi.genreDetailList(req);
  },
};

/* ==================== 初始化 /initialization ==================== */

export const initializationApi = {
  /** GET /initialization/state —— 应用是否已初始化 */
  state(): Promise<InitializationState> {
    return apiRequest("GET", R.initialization.state);
  },

  /** POST /initialization/prepare —— NAS SSO 授权码创建初始化会话（首次使用） */
  prepare(req: { code: string; deviceId: string }): Promise<InitializationPrepareResponse> {
    return apiRequest("POST", R.initialization.prepare, req);
  },

  /** POST /initialization/confirm —— 确认初始化（设置管理员账号/服务器名），返回登录态 */
  confirm(req: InitializationConfirmRequest): Promise<{ userToken: string; user: MusicUser }> {
    return apiRequest("POST", R.initialization.confirm, req);
  },
};

/* ==================== 歌词 /lyric ==================== */

export const lyricApi = {
  /** GET /lyric/list —— 曲目歌词列表（含首选 guid） */
  list(req: { trackGUID: string }): Promise<LyricListResponse> {
    return apiRequest("GET", R.lyric.list, undefined, { query: { trackGUID: req.trackGUID } });
  },
};

/* ==================== 播放历史 /play-history ==================== */

export const playHistoryApi = {
  /**
   * GET /play-history/list —— 播放历史分页。
   * 注意：原版 web UI 不直接调用（播放记录经 event.report 上报），结构按分页惯例推断。
   */
  list(req: PagedRequest): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.playHistory.list, undefined, { query: pagedQuery(req) });
  },

  /** POST /play-history/delete —— 删除播放历史（请求体为推断） */
  delete(req: { trackGUID: string }): Promise<null> {
    return apiRequest("POST", R.playHistory.delete, req);
  },
};

/* ==================== 歌单 /playlist ==================== */

export const playlistApi = {
  /** GET /playlist/list —— 全部歌单（不分页，web 端传 undefined body） */
  async list(): Promise<{ list: Playlist[] }> {
    const resp = await apiRequest<{ list: Playlist[] }>("GET", R.playlist.list);
    return { list: normalizeList(resp) };
  },

  /** GET /playlist/batch-detail —— 批量查询歌单曲目数（guids 逗号分隔，web 每批 100 个） */
  batchDetail(req: { guids: string }): Promise<{ list: PlaylistTrackCount[] }> {
    return apiRequest("GET", R.playlist.batchDetail, undefined, { query: { guids: req.guids } });
  },

  /** POST /playlist/create —— 创建歌单（name ≤32 字符；封面走 uploadCover） */
  create(req: { name: string; coverId?: string }): Promise<Playlist> {
    return apiRequest("POST", R.playlist.create, req);
  },

  /** POST /playlist/edit —— 编辑歌单（guid + 变更字段） */
  edit(req: { guid: string; name?: string; coverId?: string }): Promise<null> {
    return apiRequest("POST", R.playlist.edit, req);
  },

  /** POST /playlist/delete —— 删除歌单 */
  delete(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.playlist.delete, req);
  },

  /** GET /playlist/detail —— 歌单详情 */
  detail(req: { guid: string }): Promise<Playlist> {
    return apiRequest("GET", R.playlist.detail, undefined, { query: { guid: req.guid } });
  },

  /** POST /playlist/add-track —— 添加曲目到歌单 */
  addTrack(req: { guid: string; trackGUIDs: string[] }): Promise<null> {
    return apiRequest("POST", R.playlist.addTrack, req);
  },

  /** POST /playlist/remove-track —— 从歌单移除曲目 */
  removeTrack(req: { guid: string; trackGUIDs: string[] }): Promise<null> {
    return apiRequest("POST", R.playlist.removeTrack, req);
  },

  /** POST /playlist/purge-track —— 清除歌单内失效曲目 */
  purgeTrack(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.playlist.purgeTrack, req);
  },

  /** GET /playlist/purge-track-count —— 歌单失效曲目数量 */
  purgeTrackCount(req: { guid: string }): Promise<{ total: number }> {
    return apiRequest("GET", R.playlist.purgeTrackCount, undefined, { query: { guid: req.guid } });
  },

  /** POST /static/cover/playlist —— 上传歌单封面（multipart，字段 file） */
  uploadCover(file: FormData): Promise<CoverUploadResponse> {
    return apiRequest("POST", R.static.playlistCover, file);
  },
};

/* ==================== 搜索 /search ==================== */

export const searchApi = {
  /** GET /search/track —— 搜索曲目（web 端只传 q，全量返回） */
  track(req: { q: string }): Promise<SearchResponse<Track>> {
    return apiRequest("GET", R.search.track, undefined, { query: { q: req.q } });
  },

  /** GET /search/album —— 搜索专辑（分页） */
  album(req: { q: string; page?: number; size?: number }): Promise<SearchResponse<Album>> {
    return apiRequest("GET", R.search.album, undefined, {
      query: { q: req.q, ...(req.page != null ? { page: req.page } : {}), ...(req.size != null ? { size: req.size } : {}) },
    });
  },

  /** GET /search/artist —— 搜索歌手（分页） */
  artist(req: { q: string; page?: number; size?: number }): Promise<SearchResponse<Artist>> {
    return apiRequest("GET", R.search.artist, undefined, {
      query: { q: req.q, ...(req.page != null ? { page: req.page } : {}), ...(req.size != null ? { size: req.size } : {}) },
    });
  },

  /** GET /search/playlist —— 搜索歌单（分页） */
  playlist(req: { q: string; page?: number; size?: number }): Promise<SearchResponse<Playlist>> {
    return apiRequest("GET", R.search.playlist, undefined, {
      query: { q: req.q, ...(req.page != null ? { page: req.page } : {}), ...(req.size != null ? { size: req.size } : {}) },
    });
  },

  /** GET /search/suggest —— 搜索建议（注意响应子字段是 items） */
  suggest(req: { q: string }): Promise<SearchSuggestResponse> {
    return apiRequest("GET", R.search.suggest, undefined, { query: { q: req.q } });
  },

  /** POST /search/index/rebuild —— 重建搜索索引 */
  indexRebuild(): Promise<null> {
    return apiRequest("POST", R.search.indexRebuild);
  },
};

/* ==================== 设置 /settings ==================== */

export const settingsApi = {
  /** GET /settings/user —— 用户设置（默认共享库访问权限） */
  userDetail(): Promise<UserSettings> {
    return apiRequest("GET", R.settings.user.detail);
  },

  /** POST /settings/user —— 更新用户设置 */
  userUpdate(req: UserSettings): Promise<null> {
    return apiRequest("POST", R.settings.user.update, req);
  },

  /** GET /settings/server —— 服务器设置（名称/语言） */
  serverDetail(): Promise<ServerSettings> {
    return apiRequest("GET", R.settings.server.detail);
  },

  /** POST /settings/server —— 更新服务器设置 */
  serverUpdate(req: ServerSettings): Promise<null> {
    return apiRequest("POST", R.settings.server.update, req);
  },
};

/* ==================== 共享音乐库 /shared-library ==================== */

export const sharedLibraryApi = {
  /** GET /shared-library/list —— 音乐库列表（兼容裸数组或 { list|items|rows|libraries } 包裹） */
  async list(): Promise<SharedLibrary[]> {
    const resp = await apiRequest<SharedLibrary[] | { list?: SharedLibrary[] }>("GET", R.sharedLibrary.list);
    return normalizeList(resp);
  },

  /** POST /shared-library/reconnect/check —— 检查库路径可重连性 */
  reconnectCheck(req: { guid: string; path: string }): Promise<{ reconnected?: boolean; [key: string]: unknown }> {
    return apiRequest("POST", R.sharedLibrary.reconnectCheck, req);
  },

  /** POST /shared-library/reconnect —— 重连库路径，返回 reconnected */
  reconnect(req: { guid: string; path: string }): Promise<{ reconnected: boolean; [key: string]: unknown }> {
    return apiRequest("POST", R.sharedLibrary.reconnect, req);
  },

  /** GET /shared-library/detail —— 音乐库详情 */
  detail(req: { guid: string }): Promise<SharedLibrary> {
    return apiRequest("GET", R.sharedLibrary.detail, undefined, { query: { guid: req.guid } });
  },

  /** POST /shared-library/create —— 创建音乐库 */
  create(req: { path: string; autoDownloadLyric: boolean; metadataPreference: string }): Promise<SharedLibrary> {
    return apiRequest("POST", R.sharedLibrary.create, req);
  },

  /** POST /shared-library/edit —— 编辑音乐库 */
  edit(req: {
    guid: string;
    path: string;
    autoDownloadLyric: boolean;
    metadataPreference: string;
  }): Promise<SharedLibrary> {
    return apiRequest("POST", R.sharedLibrary.edit, req);
  },

  /** POST /shared-library/delete —— 删除音乐库 */
  delete(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.sharedLibrary.delete, req);
  },

  /** POST /shared-library/scan —— 扫描指定库 */
  scan(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.sharedLibrary.scan, req);
  },

  /** POST /shared-library/scan-all —— 扫描全部库 */
  scanAll(): Promise<null> {
    return apiRequest("POST", R.sharedLibrary.scanAll);
  },
};

/* ==================== 任务 /task ==================== */

export const taskApi = {
  /** GET /task/list —— 任务列表（兼容裸数组或 { list } 包裹） */
  async list(): Promise<Task[]> {
    const resp = await apiRequest<Task[] | { list?: Task[] }>("GET", R.task.list);
    return normalizeList(resp);
  },

  /** POST /task/cancel —— 取消任务 */
  cancel(req: { taskId: string }): Promise<null> {
    return apiRequest("POST", R.task.cancel, req);
  },

  /** POST /task/delete —— 删除任务记录 */
  delete(req: { taskId: string }): Promise<null> {
    return apiRequest("POST", R.task.delete, req);
  },

  /** POST /task/retry —— 重试失败任务 */
  retry(req: { taskId: string }): Promise<null> {
    return apiRequest("POST", R.task.retry, req);
  },
};

/* ==================== 曲目 /track ==================== */

export const trackApi = {
  /** GET /track/list —— 全库曲目分页；sort 字段：trackNo / title / createdAt 等 */
  list(req: PagedRequest): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.track.list, undefined, { query: pagedQuery(req) });
  },

  /** GET /track/album-detail/list —— 专辑内曲目；sort 字段：trackNo */
  albumDetailList(req: { albumGUID: string; page: number; size: number; sort?: SortParam }): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.track.albumDetailList, undefined, {
      query: {
        albumGUID: req.albumGUID,
        page: req.page,
        size: req.size,
        ...(req.sort ? { sort: serializeSort(req.sort)! } : {}),
      },
    });
  },

  /** GET /track/artist-detail/list —— 歌手曲目 */
  artistDetailList(req: { artistGUID: string; page: number; size: number; sort?: SortParam }): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.track.artistDetailList, undefined, {
      query: {
        artistGUID: req.artistGUID,
        page: req.page,
        size: req.size,
        ...(req.sort ? { sort: serializeSort(req.sort)! } : {}),
      },
    });
  },

  /** GET /track/genre-detail/list —— 流派内曲目 */
  genreDetailList(req: { genreGUID: string; page: number; size: number; sort?: SortParam }): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.track.genreDetailList, undefined, {
      query: {
        genreGUID: req.genreGUID,
        page: req.page,
        size: req.size,
        ...(req.sort ? { sort: serializeSort(req.sort)! } : {}),
      },
    });
  },

  /** GET /track/playlist-detail/list —— 歌单内曲目；sort 字段：trackAddedAt */
  playlistDetailList(req: {
    playlistGUID: string;
    page: number;
    size: number;
    sort?: SortParam;
  }): Promise<PagedResponse<Track>> {
    return apiRequest("GET", R.track.playlistDetailList, undefined, {
      query: {
        playlistGUID: req.playlistGUID,
        page: req.page,
        size: req.size,
        ...(req.sort ? { sort: serializeSort(req.sort)! } : {}),
      },
    });
  },

  /** GET /track/roam-start —— 随机漫游播放（电台模式）起点 */
  roamStart(req: { deviceId: string }): Promise<RoamStartResponse | null> {
    return apiRequest("GET", R.track.roamStart, undefined, { query: { deviceId: req.deviceId } });
  },

  /** GET /track/roam-next —— 漫游下一首 */
  roamNext(req: { deviceId: string; relativeRoamId: string }): Promise<RoamResponse | null> {
    return apiRequest("GET", R.track.roamNext, undefined, {
      query: { deviceId: req.deviceId, relativeRoamId: req.relativeRoamId },
    });
  },

  /** GET /track/roam-previous —— 漫游上一首 */
  roamPrevious(req: { deviceId: string; relativeRoamId: string }): Promise<RoamResponse | null> {
    return apiRequest("GET", R.track.roamPrevious, undefined, {
      query: { deviceId: req.deviceId, relativeRoamId: req.relativeRoamId },
    });
  },

  /** GET /track/metadata —— 曲目可编辑元数据 */
  metadata(req: { guid: string }): Promise<TrackMetadata> {
    return apiRequest("GET", R.track.metadata, undefined, { query: { guid: req.guid } });
  },

  /** POST /track/metadata —— 编辑曲目元数据 */
  updateMetadata(req: TrackMetadataUpdateRequest): Promise<null> {
    return apiRequest("POST", R.track.metadata, req);
  },

  /** POST /static/cover/track —— 上传曲目封面（multipart，字段 file） */
  uploadCover(file: FormData): Promise<CoverUploadResponse> {
    return apiRequest("POST", R.static.trackCover, file);
  },

  /** POST /track/transcode —— 请求转码（服务端 flac→指定码率），20s 超时 */
  transcode(req: { guid: string; output: TranscodeOutput }): Promise<TranscodeResponse> {
    return apiRequest("POST", R.track.transcode, req, { timeoutMs: 20000 });
  },

  /** POST /track/transcode/heartbeat —— 转码会话心跳（web 端 10s 间隔，3s 超时） */
  transcodeHeartbeat(req: { guid: string; timestamp: number }): Promise<TranscodeResponse> {
    return apiRequest("POST", R.track.transcodeHeartbeat, req, { timeoutMs: 3000 });
  },

  /** POST /track/transcode/quit —— 结束转码会话 */
  transcodeQuit(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.track.transcodeQuit, req);
  },
};

/* ==================== 用户管理 /user（管理员） ==================== */

export const userApi = {
  /** GET /user/list —— 用户列表（兼容裸数组或 { list } 包裹） */
  async list(): Promise<MusicUser[]> {
    const resp = await apiRequest<MusicUser[] | { list?: MusicUser[] }>("GET", R.user.list);
    return normalizeList(resp);
  },

  /** GET /user/exists —— 用户名是否已存在 */
  exists(req: { username: string }): Promise<UserExistsResponse> {
    return apiRequest("GET", R.user.exists, undefined, { query: { username: req.username } });
  },

  /** POST /user/create —— 创建用户 */
  create(req: UserCreateRequest): Promise<null> {
    return apiRequest("POST", R.user.create, req);
  },

  /** POST /user/edit —— 编辑用户（密码可选） */
  edit(req: UserEditRequest): Promise<null> {
    return apiRequest("POST", R.user.edit, req);
  },

  /** POST /user/passwd-change —— 修改当前用户密码 */
  passwdChange(req: { password: string }): Promise<null> {
    return apiRequest("POST", R.user.passwdChange, req);
  },

  /** POST /user/delete —— 删除用户 */
  delete(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.user.delete, req);
  },

  /** POST /user/unbanned —— 解禁用户 */
  unbanned(req: { guid: string }): Promise<null> {
    return apiRequest("POST", R.user.unbanned, req);
  },
};

/* ==================== 静态资源 URL（Cookie 鉴权，非 JSON 接口） ==================== */

/** 封面尺寸（原版枚举：size 查询参数取值） */
export const COVER_SIZE = {
  Original: 0,
  Small: 160,
  Medium: 600,
  Large: 1024,
  XLarge: 1600,
  XXLarge: 2000,
} as const;

export type CoverSize = (typeof COVER_SIZE)[keyof typeof COVER_SIZE];

/** GET /static/cover?coverId=&size= —— 实体封面（曲目/专辑/歌手/流派/歌单通用） */
export function buildCoverUrl(coverId: string, size?: CoverSize, apiBase = "/music/api/v1"): string {
  const params = new URLSearchParams({ coverId });
  if (size !== undefined && size !== COVER_SIZE.Original) params.set("size", String(size));
  return `${apiBase}${R.static.cover}?${params.toString()}`;
}

/** GET /track/stream?guid= —— 音频流 */
export function buildTrackStreamUrl(guid: string, apiBase = "/music/api/v1"): string {
  return `${apiBase}${R.track.stream}?guid=${encodeURIComponent(guid)}`;
}

/** GET /track/hls/:guid/preset.m3u8 —— HLS 播放列表 */
export function buildTrackHlsUrl(guid: string, apiBase = "/music/api/v1"): string {
  return `${apiBase}${R.track.hlsPreset.replace(":guid", encodeURIComponent(guid))}`;
}

/** 转码质量 → 输出参数（原版 eh()：128/256/320，缺省 320） */
export function transcodeOutput(quality: TranscodeQuality, channel: number): TranscodeOutput {
  const bitrate = quality === "128" ? 128 : quality === "256" ? 256 : 320;
  return { codec: "flac", bitrate, channel, start: 0 };
}

/* ==================== 便捷类型再导出 ==================== */

export type { AudioSpec, EntityRef, SortParam };
