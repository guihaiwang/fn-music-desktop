use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub mod sso {
    pub mod sso_win;
}

pub mod nas_image;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "windows")]
    let builder = builder.plugin(
        tauri_plugin_snap_layout::init()
            .button_id("snap-btn")
            .build(),
    );
    builder
        .plugin(tauri_plugin_os::init())
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
        .setup(|app| {
            // 构建主窗口
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("飞牛音乐")
                .disable_drag_drop_handler()
                .center()
                .min_inner_size(860.0, 580.0)
                .inner_size(1080.0, 700.0);

            let win_builder = if cfg!(target_os = "windows") {
                win_builder.decorations(false)
            } else if cfg!(target_os = "macos") {
                win_builder
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
            } else {
                win_builder
            };
            let window = win_builder.build()?;

            #[cfg(target_os = "macos")]
            {
                let quit = tauri::menu::PredefinedMenuItem::quit(app, Some("退出"))?;
                let about =
                    tauri::menu::PredefinedMenuItem::about(app, Some("关于飞牛音乐"), None)?;
                let menu =
                    tauri::menu::Submenu::with_items(app, "飞牛音乐", true, &[&about, &quit])?;
                let menus = tauri::menu::MenuBuilder::new(app).items(&[&menu]).build()?;
                app.set_menu(menus)?;
            }

            let Some(main_window) = app.get_webview_window("main") else {
                return Err("没有主窗口".into());
            };

            #[cfg(debug_assertions)] // 仅在调试构建时包含此代码
            {
                main_window.open_devtools();
            }

            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(Image::from_path("icons/32x32.png")?)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "退出" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            main_window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = &window.hide();
                }
                _ => {}
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sso::sso_win::open_sso_login,
            sso::sso_win::close_sso_login,
            nas_image::fetch_nas_image
        ])
        .run(tauri::generate_context!())
        .expect("运行tauri应用失败");
}
