'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Lock, 
  RefreshCw, 
  Search, 
  Settings, 
  Plus, 
  X, 
  Star, 
  Globe,
  Shield,
  CreditCard,
  Puzzle,
  LogOut,
  Sparkles,
  Menu,
  ChevronRight,
  Layers,
  Bot
} from 'lucide-react';
import { getGoogleSuggestions } from '@/lib/ipc';

interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
}

interface Bookmark {
  name: string;
  url: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

interface SuggestionItem {
  type: 'search' | 'url' | 'history' | 'bookmark' | 'internal';
  title: string;
  url?: string;
}

interface BrowserToolbarProps {
  url: string;
  pageTitle: string;
  isNavigating: boolean;
  onNavigate: (targetUrl: string) => void;
  onOpenSettings: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  
  // Tab controls
  tabs: Tab[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;

  // Bookmark controls
  bookmarks: Bookmark[];
  onToggleBookmark: () => void;
  isBookmarked: boolean;
  showBookmarks: boolean;

  // Theme controls
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;

  // User Profile
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;

  // Agent Sidebar controls
  isAgentSidebarOpen?: boolean;
  onToggleAgentSidebar?: () => void;

  // Advanced Tab actions (Context Menu)
  onAddTabToRight?: (id: string) => void;
  onDuplicateTab?: (id: string) => void;
  onCloseOtherTabs?: (id: string) => void;
  onCloseTabsToRight?: (id: string) => void;
  onCloseTabsToLeft?: (id: string) => void;
}

export default function BrowserToolbar({
  url,
  pageTitle,
  isNavigating,
  onNavigate,
  onOpenSettings,
  onBack,
  onForward,
  onRefresh,
  tabs = [],
  activeTabId,
  onSwitchTab,
  onAddTab,
  onCloseTab,
  bookmarks = [],
  onToggleBookmark,
  isBookmarked,
  showBookmarks,
  theme,
  onThemeChange,
  user,
  onLogin,
  onLogout,
  isAgentSidebarOpen = false,
  onToggleAgentSidebar,
  onAddTabToRight,
  onDuplicateTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseTabsToLeft,
}: BrowserToolbarProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [activeUtilityPopover, setActiveUtilityPopover] = useState<'adblock' | 'wallet' | 'extensions' | 'apps' | null>(null);
  
  // Autocomplete / Search suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Tab animation state
  const [newTabIds, setNewTabIds] = useState<Set<string>>(new Set());
  const [closingTabIds, setClosingTabIds] = useState<Set<string>>(new Set());
  const [plusPopping, setPlusPopping] = useState(false);
  const plusBtnRef = useRef<HTMLButtonElement>(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  // Ref for address bar form to detect outside clicks
  const addressBarRef = useRef<HTMLFormElement>(null);
  const mobileAddressBarRef = useRef<HTMLFormElement>(null);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync state with prop updates
  useEffect(() => {
    setInputUrl(url === 'nova://newtab' ? '' : url);
  }, [url]);

  // Track previous tab IDs to detect new tabs for animation
  const prevTabIdsRef = useRef<Set<string>>(new Set(tabs.map(t => t.id)));
  useEffect(() => {
    const prevIds = prevTabIdsRef.current;
    const currentIds = new Set(tabs.map(t => t.id));
    
    // Find newly added tabs
    const added = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIds.has(id)) {
        added.add(id);
      }
    });
    
    if (added.size > 0) {
      setNewTabIds(prev => {
        const next = new Set(prev);
        added.forEach(id => next.add(id));
        return next;
      });
    }
    
    prevTabIdsRef.current = currentIds;
  }, [tabs]);

  // Generate suggestions dynamically based on inputUrl and bookmarks
  useEffect(() => {
    const q = inputUrl.trim();
    if (!q) {
      // Show default navigation recommendations when empty
      const list: SuggestionItem[] = [];
      bookmarks.slice(0, 3).forEach(b => {
        list.push({ type: 'bookmark', title: b.name, url: b.url });
      });
      list.push({ type: 'internal', title: 'New Tab Page', url: 'nova://newtab' });
      list.push({ type: 'internal', title: 'Settings', url: 'nova://settings' });
      setSuggestions(list);
      setFocusedSuggestionIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      const qLower = q.toLowerCase();
      const list: SuggestionItem[] = [];

      // Check if it's an internal page
      if (qLower.startsWith('nova://') || 'nova://'.startsWith(qLower)) {
        if ('nova://settings'.includes(qLower)) {
          list.push({ type: 'internal', title: 'Settings', url: 'nova://settings' });
        }
        if ('nova://newtab'.includes(qLower)) {
          list.push({ type: 'internal', title: 'New Tab Page', url: 'nova://newtab' });
        }
      }

      // Bookmarks match
      bookmarks.forEach(b => {
        if (b.name.toLowerCase().includes(qLower) || b.url.toLowerCase().includes(qLower)) {
          list.push({ type: 'bookmark', title: b.name, url: b.url });
        }
      });

      // Try fetching real Google Suggestions via Rust to bypass CORS!
      try {
        const suggestions = await getGoogleSuggestions(q);
        suggestions.slice(0, 6).forEach((s: string) => {
          const isUrl = s.endsWith('.com') || s.endsWith('.org') || s.endsWith('.net') || s.startsWith('www.');
          list.push({
            type: isUrl ? 'url' : 'search',
            title: s,
            url: isUrl ? (s.startsWith('http') ? s : `https://${s}`) : undefined
          });
        });
      } catch (err) {
        console.error('Google suggest fetch error:', err);
        // Fallback to basic search if fetch failed
        list.push({ type: 'search', title: q });
        list.push({ type: 'search', title: `${q} meaning` });
        list.push({ type: 'search', title: `${q} definition` });
      }

      setSuggestions(list.slice(0, 8));
      setFocusedSuggestionIndex(-1);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [inputUrl, bookmarks]);

  // Click outside to close all popovers, context menus, and suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      setShowProfilePopover(false);
      setActiveUtilityPopover(null);
      setContextMenu(null);
      // Only close suggestions if click is OUTSIDE both address bar forms
      const target = e.target as Node;
      const insideDesktop = addressBarRef.current?.contains(target);
      const insideMobile = mobileAddressBarRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setIsInputFocused(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onNavigate(inputUrl.trim());
      setIsInputFocused(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isInputFocused || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[focusedSuggestionIndex];
        let targetUrl = selected.url || selected.title;
        if (selected.type === 'search') {
          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(selected.title)}`;
        } else if (selected.type === 'url' && !/^https?:\/\//i.test(targetUrl)) {
          targetUrl = `https://${targetUrl}`;
        }
        onNavigate(targetUrl);
        setIsInputFocused(false);
      }
    } else if (e.key === 'Escape') {
      setIsInputFocused(false);
    }
  };

  const getFaviconUrl = (siteUrl: string) => {
    try {
      const hostname = new URL(siteUrl).hostname;
      if (hostname) {
        return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
      }
    } catch (e) {}
    return null;
  };

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  };

  return (
    <div className="flex flex-col w-full bg-[#13131a] select-none z-30">
      
      {/* 1. Tab Bar Header Row */}
      <div data-tauri-drag-region className="flex items-center justify-between px-3 h-12 bg-[#0c0c10] border-b border-zinc-950">
        
        {/* Left Side: macOS traffic light window controls */}
        <div className="flex items-center gap-2 mr-3 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); import('@/lib/ipc').then(m => m.closeWindow()); }} className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/90 transition-all flex items-center justify-center relative group" title="Close">
            <span className="absolute text-[8px] text-[#4c0002] opacity-0 group-hover:opacity-100 font-bold transition-opacity">×</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); import('@/lib/ipc').then(m => m.minimizeWindow()); }} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/90 transition-all flex items-center justify-center relative group" title="Minimize">
            <span className="absolute text-[8px] text-[#5c3e00] opacity-0 group-hover:opacity-100 font-bold transition-opacity">-</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); import('@/lib/ipc').then(m => m.maximizeWindow()); }} className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/90 transition-all flex items-center justify-center relative group" title="Maximize">
            <span className="absolute text-[7px] text-[#024c00] opacity-0 group-hover:opacity-100 font-bold transition-opacity">+</span>
          </button>
        </div>

        {/* MOBILE: Active tab pill + count badge + hamburger */}
        {isMobile ? (
          <div data-tauri-drag-region className="flex items-center flex-grow h-full overflow-hidden gap-2">
            {/* Active tab pill */}
            <div className="flex items-center gap-2 flex-grow min-w-0 bg-[#13131a] rounded-lg px-3 h-[34px] my-auto">
              {(() => {
                const activeTab = tabs.find(t => t.id === activeTabId);
                const favicon = activeTab ? getFaviconUrl(activeTab.url) : null;
                return (
                  <>
                    {isNavigating ? (
                      <div className="w-3 h-3 border-2 border-[#ea4335] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : favicon ? (
                      <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-xs flex-shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <Globe className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
                    )}
                    <span className="truncate text-[11px] font-bold text-white tracking-tight flex-grow">
                      {pageTitle || activeTab?.title || 'New Tab'}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Tab count badge */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-[11px] font-bold flex-shrink-0"
              title="All Tabs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{tabs.length}</span>
            </button>

            {/* New tab */}
            <button onClick={onAddTab} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0" title="New Tab">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* Hamburger */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(true); }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
              title="Menu"
            >
              <Menu className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          /* DESKTOP: Full tabs layout */
          <div data-tauri-drag-region className="flex items-center flex-grow h-full overflow-hidden mr-4">
            <div className="flex items-center gap-1.5 max-w-[calc(100%-36px)] overflow-hidden h-full">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const favicon = getFaviconUrl(tab.url);
                const isNew = newTabIds.has(tab.id);
                const isClosing = closingTabIds.has(tab.id);
                return (
                  <div
                    key={tab.id}
                    onClick={() => !isClosing && onSwitchTab(tab.id)}
                    onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                    onAnimationEnd={() => {
                      if (isNew) {
                        setNewTabIds(prev => {
                          const next = new Set(prev);
                          next.delete(tab.id);
                          return next;
                        });
                      }
                    }}
                    className={`group relative flex items-center gap-2.5 px-3.5 h-[34px] rounded-lg text-xs font-semibold flex-1 min-w-[38px] max-w-[172px] shrink truncate cursor-pointer transition-all duration-200 my-auto ${
                      isActive 
                        ? 'bg-[#13131a] text-white shadow-sm' 
                        : 'bg-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                    } ${isNew ? 'tab-animate-open tab-animate-glow' : ''} ${isClosing ? 'tab-animate-close' : ''}`}
                  >
                    {isActive && isNavigating ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#ea4335] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : favicon ? (
                      <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-xs flex-shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <Globe className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
                    )}
                    <span className="truncate flex-grow text-[11px] font-bold tracking-tight">
                      {tab.id === activeTabId ? pageTitle || tab.title : tab.title}
                    </span>
                    {tabs.length > 1 && !isClosing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Start close animation, then actually remove after delay
                          setClosingTabIds(prev => new Set(prev).add(tab.id));
                          setTimeout(() => {
                            setClosingTabIds(prev => {
                              const next = new Set(prev);
                              next.delete(tab.id);
                              return next;
                            });
                            onCloseTab(tab.id, e);
                          }, 220);
                        }}
                        className="p-0.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center flex-shrink-0"
                      >
                        <X className="w-2.5 h-2.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              ref={plusBtnRef}
              onClick={() => {
                // Trigger + button pop animation
                setPlusPopping(true);
                setTimeout(() => setPlusPopping(false), 350);
                // Track the new tab ID so we can animate it
                // We peek at what the next tab ID will be by listening to tabs change
                const prevTabIds = new Set(tabs.map(t => t.id));
                onAddTab();
                // Use microtask to let React update tabs state
                requestAnimationFrame(() => {
                  // After onAddTab, the parent will update tabs — we detect the new one via effect
                });
              }}
              className={`p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center flex-shrink-0 ml-1.5 h-8 w-8 my-auto ${plusPopping ? 'plus-animate-pop' : ''}`}
              title="Open New Tab"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Right Side spacer (desktop only) */}
        {!isMobile && <div className="w-6" />}
      </div>{/* end tab bar row */}

      {/* 2. Main Navigation Controls Row — hidden on mobile (controls move to drawer) */}
      {!isMobile && (
      <div className="flex items-center gap-3 px-4 h-12 bg-[#13131a] border-b border-zinc-900/10">
        
        {/* Navigation History & Refresh buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onBack}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/40 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            disabled={isNavigating}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={onForward}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/40 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            disabled={isNavigating}
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/40 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            disabled={isNavigating}
            title="Reload"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isNavigating ? 'animate-spin text-[#ea4335]' : ''}`} strokeWidth={2.5} />
          </button>
        </div>

        {/* URL Address Bar Form — full-width on all sizes, max-width on desktop */}
        <form ref={addressBarRef} onSubmit={handleSubmit} className="flex-grow max-w-full md:max-w-[65%] relative">
          <div className="relative flex items-center w-full group">
            {/* Left inside: N.O.V.A logo favicon (or Globe) */}
            <div className="absolute left-3 flex items-center transition-colors">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" className="text-[#ea4335]" />
                <circle cx="12" cy="12" r="4.5" className="text-white" />
              </svg>
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type a URL"
              className="w-full h-8.5 pl-9 pr-18 text-[12.5px] font-bold rounded-full border border-zinc-800/80 bg-[#0f0f14] hover:border-zinc-700/80 focus:border-zinc-600 focus:bg-[#0f0f14] text-white placeholder-zinc-500 outline-none transition-all"
            />

            {/* Star Bookmark button inside Address Bar */}
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`absolute right-11 p-1 rounded-full hover:bg-zinc-800/60 transition-all ${
                isBookmarked 
                  ? 'text-amber-500 hover:scale-110 active:scale-95' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
            >
              <Star className="w-3.5 h-3.5 fill-current" strokeWidth={2.2} />
            </button>

            {/* Share/Upload icon inside Address Bar */}
            <button
              type="button"
              onClick={() => alert('Link copied!')}
              className="absolute right-4.5 p-1 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
              title="Share this page"
            >
              <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>

          {/* Autocomplete / Search Suggestions dropdown */}
          {isInputFocused && suggestions.length > 0 && (
            <div 
              className="absolute left-0 right-0 top-full mt-2 bg-[#1b1b24] border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left"
              onMouseDown={(e) => {
                // Prevent input blur before clicking a suggestion
                e.preventDefault();
              }}
            >
              <div className="flex flex-col py-1.5">
                {suggestions.map((suggestion, idx) => {
                  const isFocused = idx === focusedSuggestionIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        let targetUrl = suggestion.url || suggestion.title;
                        if (suggestion.type === 'search') {
                          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(suggestion.title)}`;
                        } else if (suggestion.type === 'url' && !/^https?:\/\//i.test(targetUrl)) {
                          targetUrl = `https://${targetUrl}`;
                        }
                        onNavigate(targetUrl);
                        setIsInputFocused(false);
                      }}
                      onMouseEnter={() => setFocusedSuggestionIndex(idx)}
                      className={`flex items-center gap-3 px-4.5 py-2.5 cursor-pointer select-none transition-colors ${
                        isFocused ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-850/50'
                      }`}
                    >
                      {/* Icon depending on type */}
                      {suggestion.type === 'bookmark' && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      )}
                      {suggestion.type === 'internal' && (
                        <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      {suggestion.type === 'url' && (
                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      {suggestion.type === 'search' && (
                        <Search className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      {suggestion.type === 'history' && (
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-550" />
                      )}

                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{suggestion.title}</span>
                        {suggestion.url && (
                          <span className="text-[10px] text-zinc-500 truncate max-w-xs">{suggestion.url}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Right side utilities — hidden on mobile (shown in drawer) */}
        <div className="flex items-center gap-2.5 ml-auto flex-shrink-0">
          {/* Adblocker utility (Green check shield styling) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveUtilityPopover(activeUtilityPopover === 'adblock' ? null : 'adblock');
                setShowProfilePopover(false);
              }}
              className={`p-1.5 rounded-full border transition-all ${
                activeUtilityPopover === 'adblock' 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                  : 'border-emerald-500/20 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5'
              }`}
              title="Adblock Premium"
            >
              <Shield className="w-4 h-4" strokeWidth={2.4} />
            </button>
            {activeUtilityPopover === 'adblock' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2.5 w-56 bg-[#1b1b24] border border-zinc-800 rounded-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-white">Shield Active</span>
                </div>
                <div className="text-[10px] text-zinc-400 leading-normal">
                  <p>Adblock Premium has blocked <strong className="text-white">14,809</strong> ads and trackers on this session.</p>
                </div>
              </div>
            )}
          </div>

          {/* Crypto Wallet utility (Green/grey pill styling) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveUtilityPopover(activeUtilityPopover === 'wallet' ? null : 'wallet');
                setShowProfilePopover(false);
              }}
              className={`p-1.5 rounded-full border transition-all ${
                activeUtilityPopover === 'wallet' 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                  : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
              title="Web3 Wallet"
            >
              <CreditCard className="w-4 h-4" strokeWidth={2.2} />
            </button>
            {activeUtilityPopover === 'wallet' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2.5 w-64 bg-[#1b1b24] border border-zinc-800 rounded-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="flex items-center justify-between mb-3 border-b border-zinc-850 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#78a2e1]" />
                    <span className="text-xs font-bold text-white">Nova Wallet</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Mainnet</span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">Balance</span>
                  <span className="text-lg font-black text-white">0.42 ETH</span>
                  <span className="text-[10px] text-zinc-400">≈ $1,290.54 USD</span>
                </div>
              </div>
            )}
          </div>

          {/* Extensions utility */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveUtilityPopover(activeUtilityPopover === 'extensions' ? null : 'extensions');
                setShowProfilePopover(false);
              }}
              className={`p-1.5 rounded-full border border-zinc-800 transition-all ${
                activeUtilityPopover === 'extensions' ? 'bg-[#a259ff]/10 border-[#a259ff] text-[#a259ff]' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
              title="Extensions"
            >
              <Puzzle className="w-4 h-4" strokeWidth={2.2} />
            </button>
            {activeUtilityPopover === 'extensions' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2.5 w-64 bg-[#1b1b24] border border-zinc-800 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <span className="text-[10px] font-bold text-zinc-400 block px-2.5 pb-2 border-b border-zinc-850">Installed Extensions</span>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                    <span className="text-xs font-bold text-white">Google Translate</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                    <span className="text-xs font-bold text-white">Tampermonkey</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grid of Dots (Waffle Apps Menu) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveUtilityPopover(activeUtilityPopover === 'apps' ? null : 'apps');
                setShowProfilePopover(false);
              }}
              className={`p-1.5 rounded-full border border-zinc-800 transition-all ${
                activeUtilityPopover === 'apps' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
              title="Google Apps"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <circle cx="4" cy="4" r="2" />
                <circle cx="12" cy="4" r="2" />
                <circle cx="20" cy="4" r="2" />
                <circle cx="4" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="20" cy="12" r="2" />
                <circle cx="4" cy="20" r="2" />
                <circle cx="12" cy="20" r="2" />
                <circle cx="20" cy="20" r="2" />
              </svg>
            </button>
            {activeUtilityPopover === 'apps' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2.5 w-64 bg-[#1b1b24] border border-zinc-800 rounded-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <span className="text-[10px] font-bold text-zinc-400 block border-b border-zinc-850 pb-2 mb-2">Google Apps</span>
                <div className="grid grid-cols-3 gap-3">
                  <a href="https://mail.google.com" target="_blank" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                    <div className="w-7 h-7 bg-red-500/10 rounded flex items-center justify-center text-red-500 font-bold text-xs">M</div>
                    <span className="text-[9px] text-zinc-300">Gmail</span>
                  </a>
                  <a href="https://youtube.com" target="_blank" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                    <div className="w-7 h-7 bg-red-600/10 rounded flex items-center justify-center text-red-600 font-bold text-xs">Y</div>
                    <span className="text-[9px] text-zinc-300">YouTube</span>
                  </a>
                  <a href="https://drive.google.com" target="_blank" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                    <div className="w-7 h-7 bg-amber-500/10 rounded flex items-center justify-center text-amber-500 font-bold text-xs">D</div>
                    <span className="text-[9px] text-zinc-300">Drive</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* AI Copilot Sidebar Toggle */}
          {onToggleAgentSidebar && (
            <button
              onClick={onToggleAgentSidebar}
              className={`p-1.5 rounded-full border border-zinc-800 transition-all cursor-pointer ${
                isAgentSidebarOpen
                  ? 'bg-[#6366f1]/10 border-[#6366f1] text-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.2)] hover:scale-105'
                  : 'text-zinc-400 hover:text-[#6366f1] hover:border-[#6366f1]/40 hover:bg-[#6366f1]/5'
              }`}
              title="N.O.V.A. Copilot"
            >
              <Bot className="w-4 h-4" strokeWidth={2.2} />
            </button>
          )}

          {/* Google Profile Avatar and simulated Sign-In Popover */}
          <div className="relative ml-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfilePopover(!showProfilePopover);
                setActiveUtilityPopover(null);
              }}
              className="w-8 h-8 rounded-full overflow-hidden border border-zinc-800 hover:border-zinc-700 bg-zinc-900 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
              title={user ? `Google Account: ${user.name}` : 'Sign in to Google'}
            >
              {user ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-4.5 h-4.5 text-zinc-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </button>

            {/* Profile Popover Overlay Card */}
            {showProfilePopover && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2.5 w-72 bg-[#1b1b24] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4.5 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {user ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-700">
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-white truncate">{user.name}</span>
                        <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-850">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-450">Sync is active</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          onLogout();
                          setShowProfilePopover(false);
                        }}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-zinc-750"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Turn Off Sync</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center text-center gap-2.5 py-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <svg className="w-6 h-6 text-zinc-500 fill-current" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-xs font-bold text-white">Sign in to N.O.V.A.</h4>
                        <p className="text-[9px] text-zinc-500 leading-relaxed px-2">
                          Sync your bookmarks, history, and settings across all your devices.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onLogin();
                        setShowProfilePopover(false);
                      }}
                      className="w-full py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 3-Dots Vertical Menu (Settings) */}
          <button
            onClick={() => onOpenSettings()}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all flex items-center justify-center"
            title="Browser Settings"
          >
            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

        </div>
      </div>
      )}{/* end !isMobile desktop nav row */}

      {/* Mobile-only address bar row (visible only when < 768px) */}
      {isMobile && (
        <div className="flex items-center gap-2 px-3 h-12 bg-[#13131a] border-b border-zinc-900/10">
          <button onClick={onBack} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all" title="Back">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button onClick={onRefresh} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all" title="Reload">
            <RefreshCw className={`w-3.5 h-3.5 ${isNavigating ? 'animate-spin text-[#ea4335]' : ''}`} strokeWidth={2.5} />
          </button>
          <form ref={mobileAddressBarRef} onSubmit={handleSubmit} className="flex-grow relative">
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 flex items-center">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" className="text-[#ea4335]" />
                  <circle cx="12" cy="12" r="4.5" className="text-white" />
                </svg>
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search or type a URL"
                className="w-full h-9 pl-8 pr-4 text-xs font-bold rounded-full border border-zinc-800/80 bg-[#0f0f14] hover:border-zinc-700/80 focus:border-zinc-600 text-white placeholder-zinc-500 outline-none transition-all"
              />
            </div>
            {isInputFocused && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#1b1b24] border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150" onMouseDown={(e) => e.preventDefault()}>
                <div className="flex flex-col py-1">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} onClick={() => { let t = suggestion.url || suggestion.title; if (suggestion.type === 'search') t = `https://www.google.com/search?q=${encodeURIComponent(suggestion.title)}`; onNavigate(t); setIsInputFocused(false); }} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-xs ${idx === focusedSuggestionIndex ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800/50'}`}>
                      <Search className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                      <span className="truncate font-medium">{suggestion.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
          <button onClick={onToggleBookmark} className={`p-2 rounded-full transition-all ${isBookmarked ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`} title="Bookmark">
            <Star className="w-4 h-4 fill-current" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Mobile slide-in Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-[#13131a] border-l border-zinc-800/60 z-[70] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800/50 flex-shrink-0">
              <span className="text-sm font-bold text-white">N.O.V.A.</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all">
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Nav Controls in drawer */}
            <div className="flex items-center gap-1 px-3 py-3 border-b border-zinc-800/30">
              <button onClick={() => { onBack?.(); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 text-xs font-bold transition-all">
                <ArrowLeft className="w-4 h-4" /><span>Back</span>
              </button>
              <button onClick={() => { onForward?.(); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 text-xs font-bold transition-all">
                <ArrowRight className="w-4 h-4" /><span>Fwd</span>
              </button>
              <button onClick={() => { onRefresh?.(); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 text-xs font-bold transition-all">
                <RefreshCw className="w-4 h-4" /><span>Reload</span>
              </button>
              <button onClick={() => { onAddTab(); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 text-xs font-bold transition-all">
                <Plus className="w-4 h-4" /><span>New</span>
              </button>
            </div>

            {/* Tab List */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Open Tabs</p>
              <div className="flex flex-col gap-1">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  const favicon = getFaviconUrl(tab.url);
                  return (
                    <div key={tab.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all group ${isActive ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/50 text-zinc-400'}`}>
                      <div onClick={() => { onSwitchTab(tab.id); setIsMobileMenuOpen(false); }} className="flex items-center gap-2.5 flex-grow min-w-0">
                        {favicon ? (
                          <img src={favicon} alt="" className="w-4 h-4 rounded-xs flex-shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <Globe className="w-4 h-4 flex-shrink-0 text-zinc-500" />
                        )}
                        <span className="text-xs font-semibold truncate">{tab.title}</span>
                      </div>
                      {tabs.length > 1 && (
                        <button onClick={() => onCloseTab(tab.id)} className="p-1 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Utilities section in drawer */}
            <div className="border-t border-zinc-800/40 px-3 py-3 flex flex-col gap-1 flex-shrink-0">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-zinc-800/50 cursor-pointer transition-all">
                <Shield className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Adblock Active</span>
                  <span className="text-[10px] text-zinc-500">14,809 ads blocked</span>
                </div>
              </div>
              <button onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-zinc-800/50 transition-all w-full text-left">
                <Settings className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-white">Settings</span>
              </button>
            </div>

            {/* Profile section in drawer */}
            <div className="border-t border-zinc-800/40 px-3 py-3 flex-shrink-0">
              {user ? (
                <div className="flex items-center gap-3">
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="text-xs font-bold text-white truncate">{user.name}</span>
                    <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
                  </div>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { onLogin(); setIsMobileMenuOpen(false); }} className="w-full py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-black flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* 3. Bookmarks / Top Sites Horizontal List Row */}
      {showBookmarks && bookmarks.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-2 bg-[#13131a] overflow-x-auto no-scrollbar">
          {bookmarks.map((bookmark, idx) => {
            const favicon = getFaviconUrl(bookmark.url);
            return (
              <button
                key={idx}
                onClick={() => onNavigate(bookmark.url)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-[#1b1b24]/40 border border-zinc-850/20 hover:border-zinc-800/50 transition-all duration-150 shadow-2xs"
              >
                {favicon ? (
                  <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-xs flex-shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span>{bookmark.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Tab Context Menu Overlay */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed z-50 bg-[#1b1b24] border border-zinc-850 rounded-xl p-1.5 w-52 shadow-2xl flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (onDuplicateTab) onDuplicateTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-3 py-1.5 text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Duplicate Tab
          </button>
          <button
            onClick={() => {
              if (onAddTabToRight) onAddTabToRight(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-3 py-1.5 text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Add Tab to Right
          </button>
          <hr className="border-zinc-850 my-1" />
          <button
            onClick={() => {
              onCloseTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-3 py-1.5 text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close Tab
          </button>
          <button
            onClick={() => {
              if (onCloseOtherTabs) onCloseOtherTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-3 py-1.5 text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close Other Tabs
          </button>
          <button
            onClick={() => {
              if (onCloseTabsToRight) onCloseTabsToRight(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-3 py-1.5 text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close Tabs to the Right
          </button>
          <button
            onClick={() => {
              if (onCloseTabsToLeft) onCloseTabsToLeft(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-3 py-1.5 text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close Tabs to the Left
          </button>
        </div>
      )}

    </div>
  );
}
