/**
 * authx 请求签名。
 *
 * 逆向自飞牛音乐 web 端（5e884898...B563oObE.js 中的 CO/yO/xO/bO 函数）：
 *   authx = "nonce=<6位随机>&timestamp=<毫秒>&sign=<md5(signStr)>"
 *   signStr = [SECRET, pathname, nonce, timestamp, bodyHash, apiKey].join("_")
 *
 * bodyHash:
 *   GET  -> md5(decodeURIComponent(sortedQueryStr))   // yO + xO
 *   POST -> md5(JSON.stringify(body))                 // SO
 *   无 body 时按空串处理，即 md5("")
 */
import { md5 } from "./md5";

const SIGN_SECRET = "NDzZTVxnRKP8Z0jXg1VAMonaG8akvh";

/** 对应 web 端 yO()：参数按 key 排序编码，"+" 替换为 "%20" */
function sortedQuery(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v != null) sp.append(k, String(v));
  }
  return sp.toString().replace(/\+/g, "%20");
}

/** 对应 web 端 xO()：修复非法 % 序列后 decode 再 md5 */
function hashQuery(q: string): string {
  try {
    const fixed = q.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
    return md5(decodeURIComponent(fixed));
  } catch {
    return md5(q);
  }
}

/** 对应 web 端 bO()：提取 pathname 与 search 参数 */
function parseUrl(url: string): { pathname: string; params: Record<string, string> } {
  const u = new URL(url, "http://fetch-client.local");
  const params: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    if (v !== "undefined" && v !== "null") params[k] = v;
  });
  return { pathname: u.pathname, params };
}

/** 对应 web 端 CO()：生成 authx header 值 */
export function buildAuthx(method: string, url: string, body?: unknown, apiKey = ""): string {
  const { pathname, params } = parseUrl(url);
  const isGet = method.toUpperCase() === "GET";
  const dataStr = isGet
    ? sortedQuery(params)
    : body == null
      ? ""
      : JSON.stringify(body);
  const bodyHash = isGet ? hashQuery(dataStr) : md5(dataStr);
  const nonce = String(Math.floor(Math.random() * 9e5) + 1e5);
  const timestamp = String(Date.now());
  const signStr = [SIGN_SECRET, pathname, nonce, timestamp, bodyHash, apiKey].join("_");
  return `nonce=${nonce}&timestamp=${timestamp}&sign=${md5(signStr)}`;
}
