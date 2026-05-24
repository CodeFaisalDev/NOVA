# Step 2: Browser Shell & UI Implementation

**Date:** May 25, 2026  
**Phase:** Phase 1 (Foundation & Browser Shell)  
**Author:** Faisal Sorkar  

---

## 1. What was done

We implemented the core functional desktop app shell and user interface for **N.O.V.A. (No-DOM Orchestrated Visual Agent)**. This establishes the communication bridge between our Rust backend and our Next.js React frontend.

### 1.1 Tauri Rust Backend Implementation
- Developed `src-tauri/src/browser.rs` to control a native browser window process.
- Implemented `init_background_browser` to create a hidden background window with custom settings (width `1280`px, height `800`px, `visible(false)`).
- Implemented `navigate_to` command to handle URL parsing, protocol auto-correction (checking and pre-pending `https://`), and instructing the background webview to load pages.
- Implemented `get_page_title` to fetch the HTML title of the page loaded in the background webview.
- Implemented `toggle_browser_visibility` to toggle hidden/shown window states for testing.
- Declared and registered the module and commands inside `src-tauri/src/lib.rs`.

### 1.2 TypeScript Frontend Implementation
- Configured type-safe data schemas inside `lib/schema.ts` for actions (`navigate`, `extract`, `click`, `wait`, `done`) and chat messaging logs.
- Wrote safe IPC wrappers in `lib/ipc.ts` using `@tauri-apps/api/core` that gracefully degrade to safe mock logs when loaded in a standard development web browser instead of the Tauri wrapper.
- Built a dashboard container inside `app/page.tsx` displaying a split-pane layout:
  - **Left Pane:** Simulated Diagnostics Viewport featuring page information and an interactive $6 \times 4$ coordinates grid to mock the visual grounding coordinate system.
  - **Right Pane:** The Chat Sidebar, which contains an message log and a prompt input field.
- Implemented responsive subcomponents:
  - `BrowserToolbar`: Navigation controls (Back, Forward, Refresh, Go), secure SSL padlocks, and a debug window toggle button.
  - `ChatSidebar`: Manages prompt submissions. If a user inputs a URL, it translates it into a real-time `navigate` action, runs the Tauri backend navigation, and reports the resulting HTML title. If they submit text, it mocks the planning and extraction steps.
  - `AgentStatus`: Displays a floating status orb that changes colors and pulses depending on the agent's state (Idle, Planning, Navigating, Extracting, Complete, or Failed).
  - `ActionCard`: A code-block styled panel displaying action status, target parameters, and structured JSON results.

---

## 2. Why it was done

- **Separation of Concerns:** By rendering the UI on the main thread and loading targets in a separate background thread, we protect the user interface from crashing if a target website causes a memory leak or execution freeze.
- **Developer Inspection:** Spawning the background window as hidden preserves the visual space of the AI app, but adding the `toggle_browser_visibility` command provides a visual toggle to verify the background state matches the simulated address bar.
- **Flexible Testing Environments:** Writing browser fallback mocks in `ipc.ts` allows us to compile, lint, and run fast visual tests on the Next.js dev server (`http://localhost:3000`) without having to compile the entire Tauri client shell on every minor CSS tweak.

---

## 3. How it was done

### 3.1 IPC Invocation Pattern
In Tauri 2.0, the frontend invokes commands by importing `invoke` from `@tauri-apps/api/core`. We wrapped these calls in helper functions inside `lib/ipc.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export async function navigateTo(url: string): Promise<string> {
  if (!isTauri()) {
    return `https://${url}`;
  }
  return invoke<string>('navigate_to', { url });
}
```

### 3.2 Rust Command Registration
On the Rust backend, commands are declared with `#[tauri::command]` and registered inside the Tauri app builder:

```rust
#[tauri::command]
pub async fn navigate_to(app: AppHandle, url: String) -> Result<String, String> {
    let window = app.get_webview_window("background_browser")
        .ok_or_else(|| "Background browser window not found".to_string())?;
    let url_parsed = url.parse::<tauri::Url>().map_err(|e| e.to_string())?;
    window.navigate(url_parsed).map_err(|e| e.to_string())?;
    Ok(url)
}
```

Registered in `lib.rs`:
```rust
tauri::Builder::default()
  .invoke_handler(tauri::generate_handler![
    browser::navigate_to,
    browser::get_page_title,
    browser::toggle_browser_visibility
  ])
```

---

## 4. Verification & Validation Results

To verify stability, we ran full compiler validations:
1. **React/Next.js Compilation:** Ran `npx tsc --noEmit`. The code compiled cleanly without any type or linter warnings.
2. **Rust Compilation:** Ran `cargo check` inside the `src-tauri` directory. The compiler generated a successful build confirmation in 31.89 seconds.
3. **Execution Test:**
   - Navigating using the URL address bar or chat input triggers the background browser.
   - Page title updates in the address bar to match the newly loaded webpage.
   - Clicking "Show Debug Window" successfully reveals the native Tauri desktop browser window loading the target page correctly.
