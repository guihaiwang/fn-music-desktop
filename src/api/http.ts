/**
 * HTTP 请求封装。
 * - 通过 @tauri-apps/plugin-http 发起（Rust 端代理，无浏览器 CORS 限制）
 * - 自动附加 authx 签名头
 * - 已登录时附加 Cookie: music-token=<token>（与 web 端一致）
 * - 统一解包 {code,msg,data}
 */
import { fetch } from "@tauri-apps/plugin-http";
import { buildAuthx } from "./authx";
import type { ApiResponse } from "./types";
import { useAuthStore } from "../stores/auth";

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  apiKey?: string;
  timeoutMs?: number;
}

function normalizeServer(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function buildApiBase(serverUrl: string): string {
  return `${normalizeServer(serverUrl)}/music/api/v1`;
}

/** 组装请求 URL 与 headers（authx 签名 + Cookie 令牌），apiRequest / apiRawResponse 共用 */
function prepareRequest(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  opts: RequestOptions = {},
): { url: string; headers: Record<string, string> } {
  const auth = useAuthStore();
  const base = buildApiBase(auth.serverUrl);
  const url = new URL(base + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    authx: buildAuthx(method, url.toString(), method === "GET" ? undefined : body, opts.apiKey),
  };
  // FormData（封面上传等）：交给 fetch 自动生成 multipart boundary，不手动设 Content-Type
  if (method === "POST" && body != null && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (auth.token) {
    headers["Cookie"] = `music-token=${auth.token}`;
  }
  return { url: url.toString(), headers };
}

export async function apiRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const { url, headers } = prepareRequest(method, path, body, opts);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body:
        method === "GET" || body == null
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      connectTimeout: opts.timeoutMs ?? 8000,
    });
  } catch (e) {
    // 纯浏览器预览（无 Tauri runtime）时 plugin-http 不可用
    if (typeof window !== "undefined" && !(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
      throw new ApiError(-1, "请在飞牛音乐桌面应用内使用（浏览器预览无法访问 NAS 接口）");
    }
    throw new ApiError(-1, `网络请求失败：${e instanceof Error ? e.message : String(e)}`);
  }

  let json: ApiResponse<T>;
  try {
    json = (await resp.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(resp.status, `服务器响应异常 (HTTP ${resp.status})`);
  }
  if (json.code !== 0) {
    throw new ApiError(json.code, json.msg || `请求失败 (code=${json.code})`);
  }
  return json.data;
}
