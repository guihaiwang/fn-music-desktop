use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub mod sso {
    pub mod sso_win;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_snap_layout::init()
                .button_id("snap-btn")
                .build(),
        )
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
            // // 构建主窗口
            // let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
            //     .title("飞牛音乐")
            //     .disable_drag_drop_handler()
            //     .center()
            //     .min_inner_size(500.0, 300.0)
            //     .inner_size(500.0, 300.0);
            // #[cfg(target_os = "windows")]
            // let win_builder = win_builder.decorations(false);
            #[cfg(target_os = "macos")]
            {
                // let win_builder = win_builder
                //     .hidden_title(true)
                //     .title_bar_style(tauri::TitleBarStyle::Overlay);
                let about_str = format!("关于{}", app.package_info().name);
                let quit = tauri::menu::PredefinedMenuItem::quit(app, Some("退出"))?;
                let about = tauri::menu::PredefinedMenuItem::about(app, Some(&about_str), None)?;
                let menu =
                    tauri::menu::Submenu::with_items(app, "飞牛音乐", true, &[&about, &quit])?;
                let menus = tauri::menu::MenuBuilder::new(app).items(&[&menu]).build()?;
                app.set_menu(menus)?;
            }
            // let main_window = win_builder.build()?;
            // let _ = main_window.set_size(LogicalSize::new(1024.0, 768.0))?;

            let Some(main_window) = app.get_webview_window("main") else {
                return Err("没有主窗口".into());
            };
            let _ = main_window.set_decorations(false);

            #[cfg(debug_assertions)] // 仅在调试构建时包含此代码
            {
                main_window.open_devtools();
            }

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sso::sso_win::open_sso_login,
            sso::sso_win::close_sso_login
        ])
        .run(tauri::generate_context!())
        .expect("运行tauri应用失败");
}
