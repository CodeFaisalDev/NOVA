# Step 8: Disabling Popover Menus on External Pages

**Date:** May 26, 2026  
**Phase:** Phase 3 (Chrome-style Google Sync & Layout Polish Complete)  
**Author:** Faisal Sorkar  

---

## 1. What was done

We resolved the critical visual overlap bug between native child webviews and HTML dropdown overlays by disabling these menus on external websites:

1. **Reverted Webview Bounds Sync**:
   - Reverted the bounds syncing calculation in `syncWebviewBounds` (inside [page.tsx](file:///e:/nova/app/page.tsx)) back to the original width-shrinking logic. This ensures that the webview position does not shift or slide to the left when menus are active.
2. **Created New Tab Check**:
   - Implemented an `isNewTab` helper variable inside [BrowserToolbar.tsx](file:///e:/nova/components/BrowserToolbar.tsx) checking if the active tab is loading `nova://newtab`.
3. **Disabled Google Profile Avatar Button**:
   - Gated the Google Profile button to only be clickable when `isNewTab` is true.
   - Applied disabled styles including `opacity-40` and `cursor-not-allowed` when browsing external sites.
   - Updated the tooltip title dynamically to `'Google Account (Only available on New Tab page)'` when disabled.
4. **Disabled 3-Dots Menu Button**:
   - Gated the 3-dots Menu button to only be clickable when `isNewTab` is true.
   - Applied disabled styles including `opacity-30` and `cursor-not-allowed` when browsing external sites.
   - Updated the tooltip title dynamically to `'Browser Menu (Only available on New Tab page)'` when disabled.

---

## 2. Why it was done

- **Eliminate Webpage Distortions**: Shifting or resizing the native webview on external pages causes the layout to reflow or cut off content, leading to a degraded browsing experience.
- **Contextual Relevance**: Dropping down browser menus and profile setups are browser-level administrative tasks that are naturally suited for the New Tab or Settings pages. Restricting them to `nova://newtab` maintains a clean, native-feeling app representation without layout bugs.

---

## 3. How it was done

### 3.1 Button Disabling & Tooltip Setup in `components/BrowserToolbar.tsx`

```typescript
  const isNewTab = url === 'nova://newtab';
  
  // ...

  {/* Google Profile Avatar */}
  <button
    disabled={!isNewTab}
    onClick={(e) => {
      e.stopPropagation();
      setShowProfilePopover(!showProfilePopover);
    }}
    className={`w-8 h-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center transition-all duration-200 shadow-md ${
      isNewTab
        ? 'hover:border-zinc-700 hover:scale-105 active:scale-95 cursor-pointer'
        : 'opacity-40 cursor-not-allowed'
    }`}
    title={
      !isNewTab
        ? 'Google Account (Only available on New Tab page)'
        : user
          ? `Google Account: ${user.name}`
          : 'Sign in to Google'
    }
  >
  
  // ...

  {/* 3-Dots Vertical Menu */}
  <button
    disabled={!isNewTab}
    onClick={(e) => {
      e.stopPropagation();
      setShowMenuPopover(!showMenuPopover);
    }}
    className={`p-1 rounded-lg text-zinc-400 transition-all flex items-center justify-center ${showMenuPopover ? 'bg-zinc-800/50 text-white' : ''} ${
      isNewTab
        ? 'hover:text-white hover:bg-zinc-800/50 cursor-pointer'
        : 'opacity-30 cursor-not-allowed'
    }`}
    title={!isNewTab ? 'Browser Menu (Only available on New Tab page)' : 'Browser Menu'}
  >
```

---

## 4. Verification & Validation Results

1. **Compilation Check**:
   - `npm run build` compiled the Next.js static files and ran TypeScript check successfully with zero compiler errors.
2. **Behavior Verification**:
   - Toggling menus works perfectly on the New Tab page (`nova://newtab`).
   - When navigating to any external website (e.g. `https://www.wikipedia.org`), both the profile avatar button and the 3-dots vertical menu button are disabled, rendering with a `not-allowed` cursor, reduced opacity, and helpful hover tooltips.
