/**
 * 全局消息提示（类 Element Plus 的 ElMessage，暗色胶囊样式）。
 *
 * 用法：
 *   import { message } from "../components/message/message";
 *   message.error("用户名或密码错误，请重试");
 *   message.success("已保存");
 *   message.warning("请输入用户名和密码", { duration: 5000 });
 *   message({ type: "info", message: "普通提示", showClose: true });
 *
 * 首次调用时自动挂载到 document.body，无需在组件树中手动放置。
 */
import { createVNode, reactive, render } from "vue";
import MessageHost from "./MessageHost.vue";

export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageOptions {
  /** 消息正文 */
  message: string;
  /** 消息类型，默认 "info" */
  type?: MessageType;
  /** 自动关闭毫秒数，0 表示不自动关闭，默认 3000 */
  duration?: number;
  /** 是否显示关闭按钮，默认 false */
  showClose?: boolean;
  /** 距窗口顶部偏移（px），默认 24 */
  offset?: number;
  /** 消息关闭后的回调 */
  onClose?: () => void;
}

export interface MessageState extends Required<Omit<MessageOptions, "onClose">> {
  id: number;
  onClose?: () => void;
}

/** 当前展示中的消息栈（由 MessageHost 响应式渲染） */
export const messageList = reactive<MessageState[]>([]);

/** 最多同时显示的消息条数，超出时自动关闭最早弹出（显示时间最长）的一条 */
const MAX_VISIBLE_COUNT = 5;

const timers = new Map<number, number>();
let seed = 0;
let hostMounted = false;

function ensureHost(): void {
  if (hostMounted || typeof document === "undefined") return;
  hostMounted = true;
  const container = document.createElement("div");
  container.className = "fnm-message-root";
  document.body.appendChild(container);
  render(createVNode(MessageHost), container);
}

/** 手动关闭指定消息 */
export function closeMessage(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  const index = messageList.findIndex((m) => m.id === id);
  if (index === -1) return;
  const [item] = messageList.splice(index, 1);
  item.onClose?.();
}

function push(options: MessageOptions): number {
  ensureHost();
  // 超出上限时顶掉最早弹出的消息，保证同时在屏的不超过 MAX_VISIBLE_COUNT 条
  while (messageList.length >= MAX_VISIBLE_COUNT) {
    closeMessage(messageList[0].id);
  }
  const id = ++seed;
  const item: MessageState = {
    id,
    message: options.message,
    type: options.type ?? "info",
    duration: options.duration ?? 3000,
    showClose: options.showClose ?? false,
    offset: options.offset ?? 24,
    onClose: options.onClose,
  };
  messageList.push(item);
  if (item.duration > 0) {
    timers.set(id, window.setTimeout(() => closeMessage(id), item.duration));
  }
  return id;
}

type MessageInput = MessageOptions | string;

function normalize(input: MessageInput, defaults?: Partial<MessageOptions>): MessageOptions {
  const base = typeof input === "string" ? { message: input } : input;
  return { ...defaults, ...base };
}

export const message: {
  (input: MessageInput): number;
  success(input: MessageInput): number;
  error(input: MessageInput): number;
  warning(input: MessageInput): number;
  info(input: MessageInput): number;
  /** 手动关闭指定消息 */
  close(id: number): void;
  /** 关闭全部消息 */
  closeAll(): void;
} = Object.assign(
  (input: MessageInput) => push(normalize(input)),
  {
    success: (input: MessageInput) => push(normalize(input, { type: "success" })),
    error: (input: MessageInput) => push(normalize(input, { type: "error" })),
    warning: (input: MessageInput) => push(normalize(input, { type: "warning" })),
    info: (input: MessageInput) => push(normalize(input, { type: "info" })),
    close: closeMessage,
    closeAll: () => {
      for (const item of [...messageList]) closeMessage(item.id);
    },
  },
);
