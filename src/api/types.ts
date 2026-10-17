/**
 * 飞牛音乐 API 基础类型（兼容层）。
 * 完整数据模型见 models.ts（实体/请求/响应类型），路由表见 endpoints.ts。
 */

/** 统一响应包裹：{code:0, msg:"", data:...} */
export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

/**
 * GET /sys/config 返回的系统配置。
 * 实际定义见 models.ts，此处 re-export 保持既有导入路径可用。
 */
export type { SysConfig } from "./models"

/** 登录接口返回（auth-login / password-login 共用） */
export interface LoginResult {
  userToken: string
  user: FnUser
}

/**
 * 用户信息。
 * 完整实体见 models.ts 的 MusicUser（/user/me、/user/list 的完整返回）；
 * 登录接口返回的 user 即该实体，此处保留开放字段以便渐进取用。
 */
export interface FnUser {
  name?: string
  guid?: string
  role?: "admin" | "member"
}
