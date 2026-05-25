import { invoke } from '@tauri-apps/api/core';

// Helper to safely detect if we are running inside the Tauri shell
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

/**
 * Commands the background browser to load a URL.
 */
export async function navigateTo(url: string): Promise<string> {
  if (!isTauri()) {
    console.warn('Tauri environment not detected. Mocking navigateTo:', url);
    return url.startsWith('http') ? url : `https://${url}`;
  }
  return invoke<string>('navigate_to', { url });
}

/**
 * Retrieves the current page title of the background browser.
 */
export async function getPageTitle(): Promise<string> {
  if (!isTauri()) {
    console.warn('Tauri environment not detected. Mocking getPageTitle.');
    return 'Mock Webpage Title';
  }
  return invoke<string>('get_page_title');
}

/**
 * Toggles the visibility of the background browser window.
 * Returns the new visibility state (true = visible, false = hidden).
 */
export async function toggleBrowserVisibility(): Promise<boolean> {
  if (!isTauri()) {
    console.warn('Tauri environment not detected. Mocking toggleBrowserVisibility.');
    return true;
  }
  return invoke<boolean>('toggle_browser_visibility');
}

/**
 * Synchronizes the size and position of the child browser webview overlay.
 */
export async function resizeBrowserWebview(x: number, y: number, width: number, height: number): Promise<void> {
  if (!isTauri()) {
    return;
  }
  try {
    // Round bounds to integers for correct i32/u32 deserialization in Rust
    await invoke<void>('resize_browser_webview', {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });
  } catch (err) {
    console.error('Failed to resize child webview:', err);
  }
}

/**
 * Retrieves the current page URL of the background browser.
 */
export async function getPageUrl(): Promise<string> {
  if (!isTauri()) {
    return 'https://www.google.com';
  }
  return invoke<string>('get_page_url');
}

/**
 * Minimizes the application window.
 */
export async function minimizeWindow(): Promise<void> {
  if (isTauri()) {
    await invoke<void>('minimize_window');
  }
}

/**
 * Maximizes/unmaximizes the application window.
 */
export async function maximizeWindow(): Promise<void> {
  if (isTauri()) {
    await invoke<void>('maximize_window');
  }
}

/**
 * Closes the application window.
 */
export async function closeWindow(): Promise<void> {
  if (isTauri()) {
    await invoke<void>('close_window');
  }
}

/**
 * Fetches Google Search suggestions via Rust to bypass CORS.
 */
export async function getGoogleSuggestions(query: string): Promise<string[]> {
  if (!isTauri()) {
    return [
      query,
      `${query} meaning`,
      `${query} definition`,
      `${query} examples`
    ];
  }
  try {
    return await invoke<string[]>('get_google_suggestions', { query });
  } catch (err) {
    console.error('Failed to get suggestions via IPC:', err);
    return [];
  }
}

/**
 * Calls the LLM API via the Tauri Rust backend to bypass CORS.
 */
export async function callLlmApi(
  provider: string,
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  if (!isTauri()) {
    return `[Mock Response] I received your message: "${prompt}". Configure a real API key in Settings to connect to ${provider}.`;
  }
  return invoke<string>('call_llm_api', {
    provider,
    apiKey,
    model,
    prompt,
    systemPrompt,
  });
}

