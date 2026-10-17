/**
 * 服务端响应错误码 → 中文文案（照抄原版 web bundle 的硬编码映射）。
 *
 * 原版机制（chunk 5e884898…B563oObE.js）：
 * - 数字错误码枚举与后端约定（100001 Unknown … 160001 PlaylistNameExists …）
 * - 「错误码 → 文案」映射表按语言硬编码在前端 bundle 里（zh-CN/en-US/ja-JP/de-DE 四份），
 *   不走 /static/locales 的 i18next，也不透传后端英文 msg
 * - 解析顺序：当前语言表 → zh-CN 兜底 → 后端 msg（defaultMessage）→ "操作失败"
 * - 成功码为 0 / 200（原版 Zy=[0,200]），其余一律 throw 后查表
 *
 * 本应用界面只有中文，故仅收录 zh-CN 映射表。
 */

/** 服务端错误码枚举（与原版 bundle 完全一致） */
export enum ResCode {
  /** 通用 */
  Unknown = 100001,
  InvalidArgs = 100002,
  AdminRequired = 100003,
  Forbidden = 100004,
  NotFound = 100005,

  /** 应用初始化 */
  AppAlreadyInitialized = 110001,
  AppNotInitialized = 110002,
  InitRequiresNASAdmin = 110003,
  InitSessionNotFound = 110004,

  /** 用户 / 登录 */
  Unauthorized = 120001,
  UserDisabled = 120002,
  OAuthUserAlreadyExists = 120003,
  UsernameExists = 120004,
  InvalidUsername = 120005,
  PasswordRequired = 120006,

  /** CUE */
  CueMissingOffset = 130001,

  /** 搜索 */
  SearchIndexRebuildInProgress = 140001,

  /** 音乐库 */
  SharedLibraryNameExists = 150001,
  SharedLibraryPathExists = 150002,
  SharedLibraryNoWritePermission = 150003,
  SharedLibraryHitMaxCount = 150004,
  SharedLibrarySubPathExists = 150005,

  /** 歌单 */
  PlaylistNameExists = 160001,
  PlaylistHitMaxCount = 160002,
}

/** 成功码（原版 Zy=[0,200]） */
const SUCCESS_CODES = [0, 200]

export function isSuccessCode(code: number): boolean {
  return SUCCESS_CODES.includes(code)
}

/** 错误码 → 中文文案（原版 zh-CN 映射表，逐条照抄） */
export const RES_CODE_MESSAGES: Record<number, string> = {
  [ResCode.Unknown]: "操作失败，请稍后重试",
  [ResCode.InvalidArgs]: "参数不完整或格式不正确",
  [ResCode.AdminRequired]: "仅管理员可以执行此操作",
  [ResCode.Forbidden]: "没有权限执行此操作",
  [ResCode.NotFound]: "资源不存在或已被删除",
  [ResCode.AppAlreadyInitialized]: "应用已经初始化",
  [ResCode.AppNotInitialized]: "应用尚未初始化",
  [ResCode.InitRequiresNASAdmin]: "初始化需要 NAS 管理员权限",
  [ResCode.InitSessionNotFound]: "初始化会话已过期，请重试",
  [ResCode.Unauthorized]: "登录状态已失效，请重新登录",
  [ResCode.UserDisabled]: "账号已被禁用",
  [ResCode.OAuthUserAlreadyExists]: "该 OAuth 用户已存在",
  [ResCode.UsernameExists]: "用户名已存在",
  [ResCode.InvalidUsername]: "用户名格式不正确",
  [ResCode.PasswordRequired]: "请输入密码",
  [ResCode.CueMissingOffset]: "CUE 歌曲缺少开始或结束时间",
  [ResCode.SearchIndexRebuildInProgress]: "搜索索引正在重建中",
  [ResCode.SharedLibraryNameExists]: "音乐库名称已存在",
  [ResCode.SharedLibraryPathExists]: "该文件夹已添加为音乐库",
  [ResCode.SharedLibraryNoWritePermission]: "所选文件夹无写入权限，请检查",
  [ResCode.SharedLibraryHitMaxCount]: "最多只能添加200个文件夹",
  [ResCode.SharedLibrarySubPathExists]: "已添加此文件夹的子文件夹，请检查",
  [ResCode.PlaylistNameExists]: "歌单名称已存在",
  [ResCode.PlaylistHitMaxCount]: "最多只能添加 99999 个歌单",
}

/** 默认兜底文案（原版 ab["zh-CN"]） */
export const DEFAULT_RES_CODE_MESSAGE = "操作失败"

/**
 * 解析错误码对应的展示文案（对齐原版解析函数 ub）：
 * 映射表 → 后端 msg 兜底 → 默认文案。
 *
 * @param code           响应里的 code（数字或数字字符串）
 * @param backendMessage 响应里的 msg（原版存入 ApiError.backendMessage 作 defaultMessage）
 */
export function resolveResCodeMessage(
  code: number | string | undefined | null,
  backendMessage?: string,
): string {
  const n = typeof code === "string" ? Number(code) : code
  if (typeof n === "number" && Number.isFinite(n) && RES_CODE_MESSAGES[n]) {
    return RES_CODE_MESSAGES[n]
  }
  return backendMessage?.trim() || DEFAULT_RES_CODE_MESSAGE
}
