use tauri::{AppHandle, Manager, WebviewUrl};
use tauri::webview::WebviewBuilder;
use sysinfo::System;

/// Initializes the browser webview window as a child of the main window
pub fn init_background_browser(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Get a handle to the parent Window (tauri::Window supports add_child)
    let main_window = app.get_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    // 2. Set native window properties for a unified browser shell
    main_window.set_title("N.O.V.A. Browser Shell")?;
    main_window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(1280.0, 800.0)))?;

    // 3. Create the child webview builder
    let child_builder = WebviewBuilder::new(
        "background_browser",
        WebviewUrl::External("https://www.google.com".parse()?)
    ).user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

    // 4. Attach the webview as a child of the main window
    #[cfg(target_os = "linux")]
    let child_position = tauri::LogicalPosition::new(0.0, 0.0);
    #[cfg(not(target_os = "linux"))]
    let child_position = tauri::LogicalPosition::new(0.0, 120.0);

    main_window.add_child(
        child_builder,
        child_position,
        tauri::LogicalSize::new(1280.0, 680.0)  // Initial placeholder size
    )?;

    // 5. Linux GTK Box Packing Adjustments
    // Prevent the parent webview (toolbar Next.js container) from expanding 50/50,
    // and let the child webview (background_browser) expand to fill the window.
    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        if let Ok(vbox) = main_window.default_vbox() {
            let children = vbox.children();
            println!("[N.O.V.A.] GTK vbox children count: {}", children.len());
            for (idx, child) in children.iter().enumerate() {
                println!("[N.O.V.A.] Child {}: {:?}", idx, child);
            }
            if children.len() >= 2 {
                let parent_webview = &children[0];
                let child_webview = &children[1];
                
                // Create a new overlay container
                let overlay = gtk::Overlay::new();
                
                // Remove parent and child from the vbox first
                vbox.remove(parent_webview);
                vbox.remove(child_webview);
                
                // Add the overlay container into the vbox container
                vbox.pack_start(&overlay, true, true, 0);
                
                // Add parent webview as the main base child
                overlay.add(parent_webview);
                
                // Add child webview as the overlay widget
                overlay.add_overlay(child_webview);
                
                // Set alignments for the child webview so margins acts as absolute offsets
                child_webview.set_halign(gtk::Align::Start);
                child_webview.set_valign(gtk::Align::Start);
                
                // Set initial hidden state for child webview
                child_webview.set_visible(false);
                child_webview.set_size_request(0, 0);
                
                // Ensure parent webview fills the container
                parent_webview.set_vexpand(true);
                parent_webview.set_hexpand(true);
                parent_webview.set_size_request(-1, -1);
                
                // Make sure the newly added overlay layout is visible
                vbox.show_all();
            }
        }
    }

    Ok(())
}

/// Commands the background browser webview to navigate to the specified URL
#[tauri::command]
pub async fn navigate_to(app: AppHandle, url: String) -> Result<String, String> {
    let webview = app.get_webview("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;
    
    // Auto-prepend https:// if no protocol is specified
    let formatted_url = if !url.starts_with("http://") && !url.starts_with("https://") {
        format!("https://{}", url)
    } else {
        url
    };

    let url_parsed = formatted_url.parse::<tauri::Url>()
        .map_err(|e| format!("Invalid URL: {}", e))?;
    
    webview.navigate(url_parsed)
        .map_err(|e| format!("Navigation failed: {}", e))?;
        
    Ok(formatted_url)
}

/// Retrieves the current title of the page loaded in the background browser
#[tauri::command]
pub async fn get_page_title(app: AppHandle) -> Result<String, String> {
    let webview = app.get_webview("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;
    
    let url_str = webview.url()
        .map(|u| u.to_string())
        .unwrap_or_else(|_| "Unknown Page".to_string());
        
    // Generate a clean title based on hostname as a reliable fallback
    if let Ok(parsed) = tauri::Url::parse(&url_str) {
        if let Some(host) = parsed.host_str() {
            return Ok(host.to_string());
        }
    }
    
    Ok(url_str)
}

/// Toggles the visibility of the background browser child webview
#[tauri::command]
pub async fn toggle_browser_visibility(_app: AppHandle) -> Result<bool, String> {
    Ok(true)
}

/// Synchronizes the size and position of the child browser webview overlay
#[tauri::command]
pub async fn resize_browser_webview(
    app: AppHandle,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<(), String> {
    let _webview = app.get_webview("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;

    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        let main_window = app.get_window("main")
            .ok_or_else(|| "Main window not found".to_string())?;
            
        if let Ok(vbox) = main_window.default_vbox() {
            let children = vbox.children();
            if children.len() >= 1 {
                if let Ok(overlay) = children[0].clone().downcast::<gtk::Overlay>() {
                    let overlay_children = overlay.children();
                    if overlay_children.len() >= 2 {
                        let _parent_webview = &overlay_children[0];
                        let child_webview = &overlay_children[1];
                        
                        if width <= 0 || height <= 0 {
                            child_webview.set_visible(false);
                            child_webview.set_size_request(0, 0);
                        } else {
                            let scale_factor = main_window.scale_factor().unwrap_or(1.0);
                            let logical_x = (x as f64 / scale_factor) as i32;
                            let logical_y = (y as f64 / scale_factor) as i32;
                            let logical_w = (width as f64 / scale_factor) as i32;
                            let logical_h = (height as f64 / scale_factor) as i32;
                            
                            child_webview.set_margin_start(logical_x);
                            child_webview.set_margin_top(logical_y);
                            child_webview.set_size_request(logical_w, logical_h);
                            child_webview.set_visible(true);
                        }
                    }
                }
            }
        }
    }
        
    #[cfg(not(target_os = "linux"))]
    {
        if width > 0 && height > 0 {
            _webview.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(width as u32, height as u32)))
                .map_err(|e| format!("Failed to resize webview: {}", e))?;
                
            _webview.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)))
                .map_err(|e| format!("Failed to position webview: {}", e))?;
        } else {
            let _ = _webview.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(0, 0)));
        }
    }
        
    Ok(())
}

/// Retrieves the current URL of the page loaded in the background browser
#[tauri::command]
pub async fn get_page_url(app: AppHandle) -> Result<String, String> {
    let webview = app.get_webview("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;
    
    let url_str = webview.url()
        .map(|u| u.to_string())
        .unwrap_or_else(|_| "https://www.google.com".to_string());
        
    Ok(url_str)
}

/// Evaluates a javascript snippet in the background browser webview
#[tauri::command]
pub fn eval_js_in_browser(app: AppHandle, js: String) -> Result<(), String> {
    let webview = app.get_webview("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;
    webview.eval(&js).map_err(|e| e.to_string())?;
    Ok(())
}

/// Custom window controllers for frameless browser shell
#[tauri::command]
pub fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn maximize_window(window: tauri::Window) -> Result<(), String> {
    if let Ok(maximized) = window.is_maximized() {
        if maximized {
            window.unmaximize().map_err(|e| e.to_string())?;
        } else {
            window.maximize().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

/// Fetches autocomplete suggestions from Google's Complete API backend bypass CORS
#[tauri::command]
pub async fn get_google_suggestions(query: String) -> Result<Vec<String>, String> {
    let url = format!(
        "https://suggestqueries.google.com/complete/search?client=firefox&q={}",
        urlencoding::encode(&query)
    );

    let response_str = ureq::get(&url)
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .call()
        .map_err(|e| format!("Request failed: {}", e))?
        .into_string()
        .map_err(|e| format!("Failed to read body: {}", e))?;

    let response: serde_json::Value = serde_json::from_str(&response_str)
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    if let Some(arr) = response.as_array() {
        if arr.len() >= 2 {
            if let Some(suggestions_arr) = arr[1].as_array() {
                let suggestions: Vec<String> = suggestions_arr
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
                return Ok(suggestions);
            }
        }
    }

    Ok(vec![])
}

/// Dispatches a chat completion call to the selected provider using ureq
#[tauri::command]
pub async fn call_llm_api(
    provider: String,
    api_key: String,
    model: String,
    prompt: String,
    system_prompt: String,
) -> Result<String, String> {
    let url = match provider.to_lowercase().as_str() {
        "groq" => "https://api.groq.com/openai/v1/chat/completions",
        "openrouter" => "https://openrouter.ai/api/v1/chat/completions",
        "openai" => "https://api.openai.com/v1/chat/completions",
        _ => "https://api.groq.com/openai/v1/chat/completions",
    };

    let payload = serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3
    });

    let request = ureq::post(url)
        .set("Authorization", &format!("Bearer {}", api_key))
        .set("Content-Type", "application/json");

    // OpenRouter requires specific headers sometimes
    let request = if provider.to_lowercase() == "openrouter" {
        request
            .set("HTTP-Referer", "https://github.com/CodeFaisalDev/NOVA")
            .set("X-Title", "N.O.V.A. Browser")
    } else {
        request
    };

    let response_value: serde_json::Value = request
        .send_json(payload)
        .map_err(|e| format!("API request failed: {}", e))?
        .into_json()
        .map_err(|e| format!("Failed to read response JSON: {}", e))?;

    if let Some(choices) = response_value["choices"].as_array() {
        if !choices.is_empty() {
            if let Some(content) = choices[0]["message"]["content"].as_str() {
                return Ok(content.to_string());
            }
        }
    }

    if let Some(err_msg) = response_value["error"]["message"].as_str() {
        return Err(format!("API Error: {}", err_msg));
    }

    Err(format!("Unexpected response format: {:?}", response_value))
}

/// Retrieves the visible text of the page loaded in the background browser webview
#[tauri::command]
pub async fn get_webview_text(app: AppHandle) -> Result<String, String> {
    let webview = app.get_webview("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;

    let (tx, mut rx) = tauri::async_runtime::channel(1);

    webview.eval_with_callback(
        "document.body.innerText || ''",
        move |result| {
            let _ = tx.blocking_send(result);
        }
    ).map_err(|e| e.to_string())?;

    let js_result = rx.recv().await.ok_or_else(|| "Failed to receive webview text".to_string())?;
    
    // Parse the JSON-serialized string returned by eval_with_callback
    let text: String = serde_json::from_str(&js_result).unwrap_or(js_result);
    Ok(text)
}

/// Retrieves the total system memory (RAM) in GB
#[tauri::command]
pub fn get_system_ram() -> Result<f64, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    let total_ram_bytes = sys.total_memory();
    let total_ram_gb = (total_ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    Ok(total_ram_gb)
}

/// Checks if Python is installed and returns its version
#[tauri::command]
pub fn check_python_installed() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    let cmd = "python";
    #[cfg(not(target_os = "windows"))]
    let cmd = "python3";

    match std::process::Command::new(cmd).arg("--version").output() {
        Ok(output) => {
            if output.status.success() {
                let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if ver.is_empty() {
                    let ver_err = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    Ok(Some(ver_err))
                } else {
                    Ok(Some(ver))
                }
            } else {
                Ok(None)
            }
        }
        Err(_) => Ok(None)
    }
}

