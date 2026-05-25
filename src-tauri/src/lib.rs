mod browser;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "linux")]
  {
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  }

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Initialize the hidden background webview window
      browser::init_background_browser(app)?;
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      browser::navigate_to,
      browser::get_page_title,
      browser::get_page_url,
      browser::toggle_browser_visibility,
      browser::resize_browser_webview,
      browser::minimize_window,
      browser::maximize_window,
      browser::close_window,
      browser::get_google_suggestions,
      browser::call_llm_api
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
