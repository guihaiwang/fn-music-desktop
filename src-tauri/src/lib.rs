use tauri::{Emitter, Manager, WebviewUrl};

/// SSO 登录窗口标签
const SSO_WINDOW_LABEL: &str = "sso-login";

/// 打开飞牛 NAS SSO 登录窗口。
///
/// 加载 fnOS `/signin` 授权页；登录成功后 fnOS 会重定向到
/// `{origin}/music/oauth/result?code=xxx`，通过 on_navigation
/// 拦截该跳转，提取 code 并以 `sso:code` 事件发给主窗口。
#[tauri::command]
fn open_sso_login(app: tauri::AppHandle, url: String) -> Result<(), String> {
    // 已有 SSO 窗口时聚焦复用
    if let Some(existing) = app.get_webview_window(SSO_WINDOW_LABEL) {
        let _ = existing.set_focus();
        return Ok(());
    }

    let parsed: tauri::Url = url
        .parse()
        .map_err(|e| format!("SSO 地址无效: {e}"))?;

    let handle = app.clone();
    // SSO 弹窗作为主窗口的子窗口（owned window），始终保持在主窗口之上
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        SSO_WINDOW_LABEL,
        WebviewUrl::External(parsed),
    )
    .parent(&main_window)
    .map_err(|e| format!("设置父窗口失败: {e}"))?
    .title("使用 NAS 账号登录")
    .inner_size(480.0, 660.0)
    .min_inner_size(400.0, 520.0)
    .center()
    .resizable(true)
    .on_navigation(move |nav| {
        if nav.path().contains("/oauth/result") {
            let code = nav
                .query_pairs()
                .find(|(k, _)| k == "code")
                .map(|(_, v)| v.into_owned());
            if let Some(code) = code {
                let _ = handle.emit("sso:code", code);
            }
            // 登录完成，关闭 SSO 窗口并阻止加载 result 页
            if let Some(window) = handle.get_webview_window(SSO_WINDOW_LABEL) {
                let _ = window.close();
            }
            return false;
        }
        true
    })
    .build()
    .map_err(|e| format!("打开 SSO 登录窗口失败: {e}"))?;

    // 窗口销毁（含用户手动关闭）时通知主窗口取消等待态
    let closed_handle = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            let _ = closed_handle.emit("sso:closed", ());
        }
    });

    Ok(())
}

/// 关闭 SSO 登录窗口（用户取消时调用）
#[tauri::command]
fn close_sso_login(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(SSO_WINDOW_LABEL) {
        let _ = window.close();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_sso_login, close_sso_login])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
