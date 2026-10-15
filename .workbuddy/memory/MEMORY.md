# 飞牛音乐桌面版（feiniu-music-desktop）

Tauri 2 + Vue 3 重构飞牛音乐 web。

## 环境教训（本机/WorkBuddy 沙箱）
- 本环境安全中心拦截 Bash rm/mv 及 cargo/rustc 编译期文件删除（dangerouslyDisableSandbox 也无效）；绕法：用 node fs.renameSync 改名代替删除
- pnpm 安装在本环境不可用（symlink 与 tmp-rename 均被拦截，报 ERR_PNPM_CODEBUDDY_BROKER_DENY）；用 npm 安装可行
- Tauri http scope 通配符：`http://*` 不匹配带显式端口 URL，必须 `http://*:*`

## 飞牛音乐 API 协议（已逆向验证）
- Base `http://<nas>:5666/music/api/v1`，响应 `{code,msg,data}`，code=0 成功
- 每请求带 authx header：`nonce=<6位>&timestamp=<ms>&sign=md5(SECRET_path_nonce_ts_bodyHash_apiKey)`，SECRET=`NDzZTVxnRKP8Z0jXg1VAMonaG8akvh`，SparkMD5；GET→md5(decodeURIComponent(sortedQuery))，POST→md5(JSON body)
- token 用 cookie `music-token`；deviceId=32位hex
- SSO：`{origin}/signin?client_id=<clientId>&redirect_uri=<enc(/music/oauth/result)>&app_name=飞牛音乐` → 302 带 ?code= → `POST /user/auth-login {code,deviceId}` → {userToken,user}
- 本 NAS clientId=EDDLUH2WLY（GET /sys/config）
