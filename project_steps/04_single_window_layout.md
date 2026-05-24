# Step 4: Redo Phase 1 — Pure Browser Shell

**Date:** May 25, 2026  
**Phase:** Phase 1 (Foundation & Unified Shell Layout)  
**Author:** Faisal Sorkar  

---

## 1. What was done

Per user instructions, we simplified the application to a pure, high-performance web browser shell in a single window, stripping out all agent console, chatbot sidebar, status badges, and planning features.
1. **Simplified React Viewport:** Modified `app/page.tsx` to render only the `BrowserToolbar` at the top and the webview viewport anchor `div` at the bottom. Removed all sidebar elements, resizers, and chatbot controls.
2. **Reverted to Native Child Webview:** Restored `"background_browser"` as a native child webview via `add_child` instead of a separate top-level transient window. This prevents any Wayland/compositor window detachment.
3. **Overrode GTK Packing on Linux:** Utilized the `gtk` crate to access the underlying window container (`vbox`) on Linux. Modified the packing parameters of the child widgets so that:
   - The parent webview (toolbar container) does NOT expand (`expand: false`).
   - The child webview (web browser) expands to fill the entire remaining vertical space (`expand: true`).
4. **Clean Compilation:** Resolved all Rust compiler errors (missing imports, type mismatches) and type-checked the Next.js frontend with zero errors.

---

## 2. Why it was done

- **To Fix the 50/50 Screen Split Bug:** By default, Tauri's WebKitGTK wrapper packs all webview windows with `expand: true`, dividing the window's vertical space equally. For a browser shell, this resulted in a split-screen (top half Next.js, bottom half webpage). By overriding the packing parameters in Rust, we forced the toolbar to occupy only its necessary height (`88px`), allowing the webpage to span the rest of the window.
- **To Remove Unwanted AI Bloat:** The user requested a clean starting point with a pure browser shell before introducing any decentralized mesh or agent layers.
- **To Stabilize Rendering:** Reverting to a child webview within the main window ensures it stays locked within the parent shell, eliminating window dragging lag or clipping issues.

---

## 3. How it was done

### 3.1 Cargo.toml Dependency
Added the `gtk` crate to compile the layout layout constraints:
```toml
gtk = "0.18"
```

### 3.2 GTK Box Packing Code (`src-tauri/src/browser.rs`)
```rust
    // Attach the webview as a child of the main window
    main_window.add_child(
        child_builder,
        tauri::LogicalPosition::new(0.0, 88.0),
        tauri::LogicalSize::new(1280.0, 712.0)
    )?;

    // Force GTK layout constraints
    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        if let Ok(vbox) = main_window.default_vbox() {
            let children = vbox.children();
            if children.len() >= 2 {
                let parent_webview = &children[0];
                let child_webview = &children[1];
                
                vbox.set_child_packing(parent_webview, false, true, 0, gtk::PackType::Start);
                vbox.set_child_packing(child_webview, true, true, 0, gtk::PackType::Start);
            }
        }
    }
```

### 3.3 React Layout (`app/page.tsx`)
```tsx
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-300">
      <BrowserToolbar
        url={url}
        pageTitle={pageTitle}
        isNavigating={isNavigating}
        onNavigate={handleNavigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onBack={() => console.log('Mock Back')}
        onForward={() => console.log('Mock Forward')}
        onRefresh={() => handleNavigate(url)}
      />

      {/* Viewport content area */}
      <div ref={viewportRef} className="flex-1 w-full h-full relative bg-white dark:bg-zinc-950 overflow-hidden" />
    </div>
  );
```
