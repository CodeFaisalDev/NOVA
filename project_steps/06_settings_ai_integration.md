# Step 6: Settings AI Integration & Native Rust API Bridge

**Date:** May 25, 2026  
**Phase:** Phase 2 (Live AI Capability Complete)  
**Author:** Faisal Sorkar  

---

## 1. What was done

We completed the execution of Phase 2 by implementing secure API credential handling, updating browser settings options, and building a native Rust-based LLM completion pipeline:

1. **CORS-Free Native Rust Completion API**:
   - Implemented `#[tauri::command] pub async fn call_llm_api(...)` inside `src-tauri/src/browser.rs`.
   - Used `ureq` to dispatch HTTP POST requests directly to Groq, OpenRouter, and OpenAI endpoints, bypassing browser CORS rules entirely.
   - Enabled the `json` feature of `ureq` in `Cargo.toml` for payload assembly and automatic JSON response parsing.
   - Handled authentication headers and propagated API and network errors cleanly back to Next.js.
2. **Settings Preferences Panel Updates**:
   - Updated the custom internal settings page (`nova://settings` in `app/page.tsx`) and the `components/SettingsModal.tsx` component.
   - Added an **AI Configuration** card supporting provider selection (Groq, OpenRouter, OpenAI), model text field, and secure masked password key inputs.
   - Configured auto-setting defaults (e.g. `llama-3.3-70b-versatile` when Groq is selected).
3. **Frontend Integration & Local Storage Synchronization**:
   - Bound AI settings states to `localStorage` key names (`nova-ai-provider`, `nova-ai-model`, `nova-ai-apikey`) to persist credentials across session restarts.
   - Updated the Copilot submission flow (`handleSendAgentMessage` in `app/page.tsx`) to compose context-aware system prompts (including current tab title & URL) and invoke the native LLM pipeline.
   - Implemented helpful fallback messages prompting users to configure credentials when key values are missing.

---

## 2. Why it was done

- **Credentials Isolation**: Performing API requests on the native side prevents third-party site scripts running in the child webviews from gaining access to API keys.
- **Reliability**: A Rust-based bridge avoids CORS issues that frequently occur when calling API endpoints directly from client-side browser wrappers.
- **Contextual Intelligence**: Injecting the active page URL and HTML Title in the system prompt allows the assistant to answer page-specific questions.

---

## 3. How it was done

### 3.1 Rust IPC Bridge (`src-tauri/src/browser.rs`)
```rust
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
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": prompt }
        ],
        "temperature": 0.3
    });

    let request = ureq::post(url)
        .set("Authorization", &format!("Bearer {}", api_key))
        .set("Content-Type", "application/json");

    let response_value: serde_json::Value = request
        .send_json(payload)
        .map_err(|e| format!("API request failed: {}", e))?
        .into_json()
        .map_err(|e| format!("Failed to read response JSON: {}", e))?;

    // Choice extraction and API error bubbling...
}
```

---

## 4. Verification & Validation Results

1. **Compilation Check**:
   - TypeScript checks: `npx tsc --noEmit` passed.
   - Cargo build check: `cargo check` inside `src-tauri` finished successfully.
2. **Session Persistence**:
   - Custom keys and selections successfully write to/load from `localStorage`.
3. **Dynamic Response Validation**:
   - Tested real-world assistant requests; messages are submitted, typed states animate, and API replies are returned and parsed.
