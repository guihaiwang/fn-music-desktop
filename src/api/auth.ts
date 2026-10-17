/**
 * 飞牛音乐认证相关 API（对应原版 web 客户端的 auth 接口组）。
 *
 *   GET  /sys/config
 *   GET  /initialization/state
 *   POST /initialization/prepare    {code, deviceId}
 *   POST /initialization/confirm    {sessionId, user:{name,password}, server:{name,lang}}
 *   POST /user/auth-login           {code, deviceId}      — SSO code 换 token
 *   POST /user/password-login       {username, password(sha256 hex), deviceId}
 *   GET  /user/me
 *   POST /user/logout
 */
import { apiRequest } from "./http";
import { API_ROUTES as R } from "./endpoints";
import { initializationApi } from "./music";
import { useAuthStore } from "../stores/auth";
import type {
  FnUser,
  InitializationPrepareResponse,
  InitializationState,
  LoginResult,
  SysConfig,
} from "./models";

export { initializationApi };

/** 获取系统配置（含 nasOAuth.clientId / serverName） */
export function getSysConfig(): Promise<SysConfig> {
  return apiRequest<SysConfig>("GET", R.sys.config);
}

/** SSO 授权码换取登录态 */
export function authLogin(code: string, deviceId: string): Promise<LoginResult> {
  return apiRequest<LoginResult>("POST", R.user.authLogin, { code, deviceId });
}

/** SHA-256 hex（Web Crypto） */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 用户名密码登录（password 为 sha256 hex，与 web 端一致） */
export function passwordLogin(
  username: string,
  password: string,
  deviceId: string,
): Promise<LoginResult> {
  return sha256Hex(password).then((hashed) =>
    apiRequest<LoginResult>("POST", R.user.passwordLogin, {
      username,
      password: hashed,
      deviceId,
    }),
  );
}

/** 当前登录用户 */
export function getCurrentUser(): Promise<FnUser> {
  return apiRequest<FnUser>("GET", R.user.me);
}

/** 登出 */
export function logout(): Promise<unknown> {
  return apiRequest("POST", R.user.logout);
}

/* ==================== 初始化（首次使用向导） ==================== */

/** 应用是否已初始化 */
export function getInitializationState(): Promise<InitializationState> {
  return initializationApi.state();
}

/** 用 NAS SSO 授权码创建初始化会话（返回 sessionId + 管理员信息） */
export function prepareInitialization(req: {
  code: string;
  deviceId: string;
}): Promise<InitializationPrepareResponse> {
  return initializationApi.prepare(req);
}

/** 确认初始化（设置管理员账号/服务器名），返回登录态 */
export function confirmInitialization(req: {
  sessionId: string;
  user: { name: string; password: string };
  server: { name: string; lang: string };
}): Promise<LoginResult> {
  return initializationApi.confirm(req);
}

/**
 * 构造 fnOS SSO 登录 URL（对应 web 端 getNasOauthUrl）：
 *   {origin}/signin?client_id={clientId}&redirect_uri={/music/oauth/result}&app_name=飞牛音乐
 * 登录成功后 fnOS 会重定向到 redirect_uri 并附带 ?code=xxx，
 * 桌面端在 Rust 侧通过 on_navigation 拦截该跳转提取 code。
 */
export async function buildNasOauthUrl(): Promise<string> {
  const auth = useAuthStore();
  const cfg = await getSysConfig();
  const clientId = cfg.nasOAuth?.clientId;
  if (!clientId) {
    throw new Error("NAS 未返回 OAuth clientId，无法使用 NAS 登录");
  }
  const origin = cfg.nasOAuth?.url || new URL(auth.serverUrl).origin;
  const redirectUri = encodeURIComponent(`${origin}/music/oauth/result`);
  const appName = encodeURIComponent("飞牛音乐");
  return `${origin.replace(/\/+$/, "")}/signin?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&app_name=${appName}`;
}
