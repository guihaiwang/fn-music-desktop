/**
 * 设备 ID：32 位小写 hex（无横线 UUID），首次生成后持久化。
 * 与 web 端 Ek() 行为一致（localStorage 持久化）。
 */
const KEY = "fnm.deviceId";

export function getDeviceId(): string {
  const existing = localStorage.getItem(KEY);
  if (existing && /^[a-f0-9]{32}$/i.test(existing)) return existing.toLowerCase();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  localStorage.setItem(KEY, id);
  return id;
}
