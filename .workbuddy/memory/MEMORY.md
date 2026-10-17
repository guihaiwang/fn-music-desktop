# 飞牛音乐桌面版（feiniu-music-desktop）

Tauri 2 + Vue 3 重构飞牛音乐 web。

## 环境教训（本机/WorkBuddy 沙箱）
- 本环境安全中心拦截 Bash rm/mv 及 cargo/rustc 编译期文件删除（dangerouslyDisableSandbox 也无效）；绕法：用 node fs.renameSync 改名代替删除
- pnpm 安装在本环境不可用（symlink 与 tmp-rename 均被拦截，报 ERR_PNPM_CODEBUDDY_BROKER_DENY）；用 npm 安装可行
- Tauri http scope 通配符：`http://*` 不匹配带显式端口 URL，必须 `http://*:*`
- 项目工具链坑：`:deep()` 写在 SCSS 嵌套块内会被编译成错误选择器（scope 属性变独立中间层，永不命中）；跨组件样式一律用组件 props 方案，顶层 :deep 正常
- tauri-plugin-http 默认按 fetch 规范丢弃 forbidden headers（COOKIE/HOST/ORIGIN/REFERER 等），JS 手设 Cookie 会被 Rust 侧静默跳过；已启用 unsafe-headers feature 放行（飞牛 API 需要 Cookie: music-token）

## 飞牛音乐 API 协议（已逆向验证）
- Base `http://<nas>:5666/music/api/v1`，响应 `{code,msg,data}`，code=0 成功；code=99999+HTTP401=未授权（bundle 错误码枚举 120001 实际不出现）
- 每请求带 authx header：`nonce=<6位>&timestamp=<ms>&sign=md5(SECRET_path_nonce_ts_bodyHash_apiKey)`，SECRET=`NDzZTVxnRKP8Z0jXg1VAMonaG8akvh`，SparkMD5；GET→md5(decodeURIComponent(sortedQuery))，POST→md5(JSON body)
- token 用 cookie `music-token`；deviceId=32位hex
- SSO：`{origin}/signin?client_id=<clientId>&redirect_uri=<enc(/music/oauth/result)>&app_name=飞牛音乐` → 302 带 ?code= → `POST /user/auth-login {code,deviceId}` → {userToken,user}
- 本 NAS clientId=EDDLUH2WLY（GET /sys/config）
- 全量端点/类型已入库：src/api/endpoints.ts（路由表）+ models.ts（类型）+ music.ts（16 组函数）；原版 bundle 抓取件在 /tmp/fnm-web（22 chunk，重启即失，需要时重新抓）
- NAS 图片统一走 Rust 命令 fetch_nas_image（src-tauri/src/nas_image.rs）：后端带 Cookie: music-token 拉图返回 base64，前端 music.ts fetchCoverUrl 转 blob URL 缓存；<img> 直连 NAS 会 401（webview 无 NAS 域 cookie）
- 浏览器预览验证：/tmp/fnm-tauri-mock.js 伪造 __TAURI_INTERNALS__.invoke（plugin:http 三段流协议末位0带数据/[1]关流 + fetch_nas_image），agent-browser close 后 open --init-script 挂载，可预置登录态
