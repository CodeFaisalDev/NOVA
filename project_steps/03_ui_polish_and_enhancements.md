# Step 3: Browser Enhancements, Themes, and Window Layouts

**Date:** May 25, 2026  
**Phase:** Phase 1 (Foundation & Browser Shell Polish)  
**Author:** Faisal Sorkar  

---

## 1. What was done

We addressed critical usability and browser behavior feedbacks by implementing five key features:
1. **Dynamic Side-by-Side Docking:** Configured the Tauri backend to query the user's primary monitor resolution, position the main React Control Panel window on the right side of the screen, and spawn the browser viewport window on the left side of the screen. Both windows are now visible and active by default.
2. **Omnibox Search Engine Routing:** Updated the address bar navigation inputs so that if a search phrase is entered instead of a direct URL (e.g. "mechanical keyboards"), it is automatically routed to the user's preferred search engine.
3. **Collapsible and Resizable Sidebar Layout:** Built a mouse drag event listener on a vertical divider between the diagnostic monitor pane and the chat sidebar. Added double-click to reset, and a quick chevron toggle to hide/show the sidebar entirely.
4. **Settings Panel Integration:** Created `components/SettingsModal.tsx` to let the user configure default homepage URL, search engine preferences, theme preferences, and clear browser cookies/history cache.
5. **System OS Theme Synchronization:** Implemented standard media queries to listen for system-wide light/dark theme changes, and write/read theme configurations (`light` | `dark` | `system`) inside the document root and localstorage.

---

## 2. Why it was done

- **Real Desktop Integration:** Spawning two windows side-by-side solves the restriction of sandboxed iframes. The user can interact with any website natively in the browser window, while the control console tracks activities.
- **Improved Workspace Ergonomics:** Enabling the user to resize the agent console or collapse it entirely makes the browser window flexible, preventing controls from crowding the screen.
- **True Browser Omnibox Behavior:** Seamless search engine routing allows users to search the web immediately, making the search bar act like standard browsers.

---

## 3. How it was done

### 3.1 Side-by-Side Positioning in Rust
On startup, we query the primary monitor, calculate 58% width for the browser, 42% for the control panel, apply scale factors, and position both windows:

```rust
let (browser_width, control_width, usable_height, x_offset_control, y_offset) = if let Some(monitor) = app.primary_monitor()? {
    let scale_factor = monitor.scale_factor();
    let screen_size = monitor.size().to_logical::<f64>(scale_factor);
    
    let margin = 16.0;
    let top_bar = 40.0;
    let usable_h = (screen_size.height - top_bar - margin * 2.0).max(600.0);
    
    let b_width = (screen_size.width * 0.58).max(750.0);
    let c_width = (screen_size.width - b_width - margin * 3.0).max(380.0);
    
    (b_width, c_width, usable_h, b_width + margin * 2.0, top_bar + margin)
}
```

### 3.2 Draggable Resizing in React
We attached mouse listeners to the viewport to update width states dynamically on drag:

```typescript
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 280 && newWidth <= 600) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => setIsResizing(false);

  if (isResizing) {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [isResizing]);
```

### 3.3 Theme Sync Logic
We toggle classes on `document.documentElement` to trigger Tailwind's dark utility system:
```typescript
const applyTheme = (themeValue: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (themeValue === 'dark') {
    root.classList.add('dark');
  } else if (themeValue === 'light') {
    root.classList.add('light');
  } else {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(isSystemDark ? 'dark' : 'light');
  }
};
```

---

## 4. Verification & Validation Results

1. **Compilation Checks:** Next.js compiles with zero type errors. Rust backend builds successfully inside the Tauri wrapper.
2. **Interactive Testing:**
   - Dragging the sidebar divider resizes it smoothly.
   - Toggling themes (Dark / Light / System OS) immediately updates the color scheme of all components.
   - Toggling settings (Homepage URL / Search Engine) updates search behavior and default load URLs.
   - Responding to window sizes works responsively on all screens.
