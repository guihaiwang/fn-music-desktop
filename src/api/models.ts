/**
 * 飞牛音乐 API 数据模型（逆向自原版 web bundle 5e884898.../1bc04.../fd1fcd.../7dfb.../016b...）。
 *
 * 说明：
 * - 类型字段与原始 JSON 响应保持一致（服务端即 camelCase），不引入视图层映射
 * - 标注「推断」的请求/响应结构在 web UI 中无调用点（如 play-history、
 *   app-center/sub/create），按同类端点惯例推断，接入真机时需验证
 * - 分页响应统一为 { list, total, sort? }，sort 为 "field,order" 字符串
 */
import type { ApiResponse, FnUser, LoginResult } from "./types"

export type { ApiResponse, FnUser, LoginResult }

/* ==================== 系统配置 ==================== */

/** GET /sys/config 返回的系统配置 */
export interface SysConfig {
  nasOAuth?: {
    clientId?: string
    /** 可选的独立 SSO 服务地址，缺省用服务器 origin */
    url?: string
  }
  serverGUID: string
  serverName: string
  serverVersion: string
  mediasrvVersion?: string
  capabilities?: Record<string, unknown>
}

/* ==================== 通用 ==================== */

/** 排序方向 */
export type SortOrder = "asc" | "desc"

/** 排序参数（请求时序列化为 `"<field>,<order>"` 字符串，见 serializeSort） */
export interface SortParam {
  field: string
  order: SortOrder
}

/** 分页列表请求（page 从 1 开始） */
export interface PagedRequest {
  page: number
  size: number
  sort?: SortParam
}

/** 分页列表响应（sort 为服务端回显的 "field,order" 字符串） */
export interface PagedResponse<T> {
  list: T[]
  total: number
  sort?: string
}

/** GUID + 名称引用（歌手/流派等在曲目内的内嵌形态） */
export interface EntityRef {
  guid?: string
  name?: string
}

/** 已知的业务错误码（原版 web 错误码枚举） */
export const MusicErrorCode = {
  Unknown: 100001,
  InvalidArgs: 100002,
  AdminRequired: 100003,
  Forbidden: 100004,
  NotFound: 100005,
  AppAlreadyInitialized: 110001,
  AppNotInitialized: 110002,
  InitRequiresNASAdmin: 110003,
  InitSessionNotFound: 110004,
  Unauthorized: 120001,
  UserDisabled: 120002,
  OAuthUserAlreadyExists: 120003,
  UsernameExists: 120004,
  InvalidUsername: 120005,
  PasswordRequired: 120006,
  CueMissingOffset: 130001,
  SearchIndexRebuildInProgress: 140001,
  SharedLibraryNameExists: 150001,
  SharedLibraryPathExists: 150002,
  SharedLibraryNoWritePermission: 150003,
  SharedLibraryHitMaxCount: 150004,
  SharedLibrarySubPathExists: 150005,
  PlaylistNameExists: 160001,
  PlaylistHitMaxCount: 160002,
} as const

export type MusicErrorCodeValue = (typeof MusicErrorCode)[keyof typeof MusicErrorCode]

/* ==================== 曲目 / 专辑 / 歌手 / 流派 ==================== */

/** 音频规格（raw：bitrate 为 bps，channel 为声道数） */
export interface AudioSpec {
  /** 文件在 NAS 上的路径 */
  path?: string
  /** 容器格式（如 flac、mp3），缺省时 web 端用扩展名兜底 */
  format?: string
  codec?: string
  /** 声道数 */
  channel?: number
  sampleRate?: number
  bitDepth?: number
  /** 比特率（bps），展示时 /1000 转 kbps */
  bitrate?: number
  /** 文件大小（字节） */
  size?: number
}

/** 曲目内嵌的专辑引用 */
export interface TrackAlbumRef {
  guid: string
  name?: string
  coverId?: string
  artists?: EntityRef[]
  originalReleaseYear?: number
}

export interface Track {
  guid: string
  title: string
  artists?: EntityRef[]
  album?: TrackAlbumRef
  /** 音轨号（专辑/歌单内） */
  trackNo?: number
  discNo?: number
  discTitle?: string
  discName?: string
  partTitle?: string
  partName?: string
  /** 时长（毫秒），展示时 /1000 转秒 */
  duration: number
  year?: number
  coverId?: string
  isFavorite: boolean
  /** 是否 CUE 虚拟曲目 */
  isCue: boolean
  /** 资源可用状态：0 可用，非 0 不可用（1/3 缺文件，2/4 无权限） */
  accessStatus: number
  audioSpec?: AudioSpec
  /** Unix 秒级时间戳 */
  createdAt: number
  /** Unix 秒级时间戳 */
  updatedAt: number
}

export interface Album {
  guid: string
  name: string
  artists?: EntityRef[]
  coverId?: string
  originalReleaseYear?: number
  /** 发行日期（ISO 字符串） */
  releaseDate?: string
  trackCount?: number
}

/** GET /album/detail 响应：当前服务端返回裸专辑；原版 web 兼容 { album, tracks } 包裹 */
export type AlbumDetail = Album & { tracks?: Track[] }

export interface Artist {
  guid: string
  name: string
  coverId?: string
  albumCount?: number
  trackCount?: number
}

export interface Genre {
  guid: string
  name: string
  coverId?: string
  trackCount?: number
}

/* ==================== 歌单 ==================== */

export interface Playlist {
  guid: string
  name: string
  coverId?: string
  /** 列表接口可能不返回，用 batch-detail 批量补 */
  trackCount?: number
}

export interface PlaylistTrackCount {
  guid: string
  trackCount: number
}

/* ==================== 歌词 ==================== */

/** 歌词来源（服务端数字枚举，响应转换见原版 di()） */
export const LyricSource = {
  /** 1 */
  Embedded: 1,
  /** 2 */
  ExternalLrc: 2,
  /** 4 */
  Manual: 4,
  /** 其他 */
  Unknown: 0,
} as const

export interface Lyric {
  guid?: string
  /** LRC 或纯文本歌词全文 */
  content: string
  /** 偏移（毫秒） */
  offset?: number
  /** 1=内嵌 2=外挂 lrc 4=手动，其他=未知 */
  source: number
  /** Unix 秒级时间戳 */
  createdAt: number
  /** Unix 秒级时间戳 */
  updatedAt: number
}

/** GET /lyric/list 响应 */
export interface LyricListResponse {
  list: Lyric[]
  /** 首选歌词的 guid */
  preferred?: string
}

/* ==================== 任务 ==================== */

export interface TaskError {
  code: number
  msg: string
  name: string
  ext1: string
  ext2: string
  ext3: string
}

export interface TaskExt {
  libraryGUID?: string
  /** 聚合任务包含的子任务 id */
  taskIds?: string[]
}

export interface Task {
  id: string
  /** 如 download / cloudScrape / cloudScrapeCorrection / lyricDownload 等 */
  type: string
  name: string
  total: number
  successCount: number
  failCount: number
  done: boolean
  cancelling: boolean
  canceled: boolean
  canceledCount: number
  /** Unix 毫秒时间戳 */
  createdAt: number
  /** Unix 毫秒时间戳 */
  doneAt: number
  errs?: TaskError[]
  retryable?: boolean
  ext?: TaskExt
}

/* ==================== 用户 / 共享音乐库 / 设置 ==================== */

export type UserRole = "admin" | "member"

/** 元数据刮削偏好（settings.user） */
export type MetadataPreference = "CloudPreferred" | "LocalOnly"

export interface SharedLibrary {
  guid: string
  name: string
  path: string
  autoDownloadLyric: boolean
  metadataPreference: MetadataPreference
  /** 资源可用状态（0 正常） */
  accessStatus: number
  /** Unix 毫秒时间戳或 null */
  contentLastChangedAt: number | null
  coverIds: string[]
}

export interface SharedLibraryAccess {
  mode: "all" | "partial" | "none"
  /** mode=partial 时生效 */
  sharedLibraries?: SharedLibrary[]
  /** mode=partial 时的库 guid 列表（请求侧） */
  guids?: string[]
}

/** 完整用户实体（/user/me、/user/list 返回） */
export interface MusicUser {
  guid: string
  name: string
  role: UserRole
  isBanned: boolean
  /** Unix 毫秒时间戳或 null */
  bannedUntil: number | null
  /** Unix 毫秒时间戳 */
  createdAt: number
  updatedAt: number
  lastAccessedAt: number | null
  trimNasUserId: string | null
  trimNasUsername: string | null
  sharedLibraryAccess: SharedLibraryAccess
  isAdmin?: boolean
  [key: string]: unknown
}

/** GET/POST /settings/server */
export interface ServerSettings {
  name: string
  lang: string
}

/** GET/POST /settings/user */
export interface UserSettings {
  defaultSharedLibraryAccess: SharedLibraryAccess
}

/** NAS 授权目录（/app-center/authed-dir/list，fnOS 侧目录） */
export interface NasAuthedDir {
  path: string
  storageType: string
  cloudStorageType: string
  /** 如 "rw" / "r" */
  permission: string
  uname: string
  address: string
  comment: string
  username: string
  proto?: string
  port?: number
}

/** /app-center/authed-dir/sub/list 子目录项 */
export interface AuthedSubDir {
  path: string
  name: string
}

/* ==================== 曲目元数据（编辑） ==================== */

/** GET /track/metadata 响应（编辑元数据用的原始形态） */
export interface TrackMetadata {
  audioSpec?: AudioSpec & { container?: string }
  track: {
    title?: string
    album?: EntityRef | string
    artists?: EntityRef[]
    genres?: (EntityRef | string)[]
    coverId?: string
    coverGUID?: string
    trackNo?: number
    discNo?: number
    year?: number;
    [key: string]: unknown
  }
}

/** POST /track/metadata 请求体（编辑曲目元数据） */
export interface TrackMetadataUpdateRequest {
  guid: string
  album?: string | null
  artistGUIDs?: string[]
  /** 裸 coverId（无前缀） */
  coverGUID?: string | null
  coverId?: string | null
  discNo?: number | null
  genreGUIDs?: string[]
  title?: string | null
  trackNo?: number | null
  year?: number | null
}

/* ==================== 随机漫游播放 ==================== */

export interface RoamItem {
  track: Track
  roamId: string
}

/** GET /track/roam-start 响应（previous 恒为 null） */
export interface RoamStartResponse {
  current: RoamItem
  next: RoamItem | null
  previous: null
}

/** GET /track/roam-next / roam-previous 响应 */
export interface RoamResponse {
  current: RoamItem
  next: RoamItem | null
  previous: RoamItem | null
}

/* ==================== 转码 ==================== */

/** 转码输出参数（quality 128/256/320 → codec flac + bitrate kbps） */
export interface TranscodeOutput {
  codec: "flac"
  /** kbps：128 / 256 / 320 */
  bitrate: number
  channel: number
  /** 起始秒（web 端固定 0） */
  start: number
}

export type TranscodeQuality = "128" | "256" | "320"

export interface TranscodeResponse {
  /** success / ready / failed / 其他进行中状态 */
  status: string
  errno?: string
  errmsg?: string
  [key: string]: unknown
}

/* ==================== 事件上报 ==================== */

export type MusicEventType = "track_play" | "lyric_offset_change"

export interface MusicEvent {
  eventType: MusicEventType
  /** Unix 毫秒时间戳 */
  occurredAt: number
  /** track_play: { trackGUID }；lyric_offset_change: { trackGUID, lyricGUID, offset(毫秒) } */
  payload: Record<string, unknown>
}

export interface EventReportRequest {
  events: MusicEvent[]
}

/* ==================== 搜索 ==================== */

export interface SearchResponse<T> {
  total: number
  list: T[]
}

/** GET /search/suggest 响应（注意子字段是 items 不是 list） */
export interface SearchSuggestResponse {
  track: { total: number; items: Track[] }
  album: { total: number; items: Album[] }
  artist: { total: number; items: Artist[] }
  playlist: { total: number; items: Playlist[] }
}

/* ==================== 初始化 ==================== */

/** GET /initialization/state */
export interface InitializationState {
  initialized: boolean
  [key: string]: unknown
}

/** POST /initialization/prepare 响应 */
export interface InitializationPrepareResponse {
  sessionId: string
  operator: {
    name: string
    isAdmin: boolean;
    [key: string]: unknown
  }
}

/** POST /initialization/confirm 请求体 */
export interface InitializationConfirmRequest {
  sessionId: string
  user: {
    name: string
    /** sha256 hex */
    password: string
  }
  server: {
    name: string
    lang: string
  }
}

/* ==================== 认证（登录/会话） ==================== */

/** GET /user/exists 响应 */
export interface UserExistsResponse {
  isExist: boolean
}

/** 共享库访问权限请求体（user.create / user.edit） */
export interface SharedLibraryAccessRequest {
  mode: "all" | "partial" | "none"
  /** mode=partial 时的库 guid 去重列表 */
  guids: string[]
}

/** POST /user/create 请求体 */
export interface UserCreateRequest {
  username: string
  /** 明文密码（服务端约束 6-127 位） */
  password: string
  sharedLibraryAccess: SharedLibraryAccessRequest
}

/** POST /user/edit 请求体 */
export interface UserEditRequest {
  guid: string
  username: string
  /** 可选；传入则同时改密 */
  password?: string
  sharedLibraryAccess: SharedLibraryAccessRequest
}

/** 封面上传响应（POST /static/cover/playlist|track） */
export interface CoverUploadResponse {
  coverId: string | null
  [key: string]: unknown
}
