/** 飞牛音乐 API 类型定义 */

/** 统一响应包裹：{code:0, msg:"", data:...} */
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

/** GET /sys/config 返回的系统配置 */
export interface SysConfig {
  nasOAuth?: {
    clientId?: string;
    /** 可选的独立 SSO 服务地址，缺省用服务器 origin */
    url?: string;
  };
  serverGUID: string;
  serverName: string;
  serverVersion: string;
  mediasrvVersion?: string;
  capabilities?: Record<string, unknown>;
}

/** 登录接口返回（auth-login / password-login 共用） */
export interface LoginResult {
  userToken: string;
  user: FnUser;
}

/** 用户信息（字段较开放，按需取用） */
export interface FnUser {
  id?: number;
  name?: string;
  username?: string;
  nickname?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}
