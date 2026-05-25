'use client';

import React, { useState, useEffect, useRef } from 'react';
import BrowserToolbar from '@/components/BrowserToolbar';
import { 
  navigateTo, 
  getPageTitle, 
  getPageUrl, 
  isTauri, 
  resizeBrowserWebview,
  getGoogleSuggestions,
  callLlmApi
} from '@/lib/ipc';
import { Search, Star, Globe, X, Settings, Eye, Shield, Lock, Mic, Heart, Sun, Utensils, Film, Plane, MessageSquare, Users, Newspaper, Plus, Bot, Sparkles, Send, Paperclip, RotateCcw, ChevronLeft, ChevronRight, Trash2, ArrowLeft } from 'lucide-react';

// ─── Frameless Window Resize Handles ──────────────────────────────────────────
// Tauri with decorations:false has no native resize handles. These invisible
// edge/corner divs restore resize-by-dragging using startResizeDragging.
type ResizeDirection =
  | 'North' | 'South' | 'East' | 'West'
  | 'NorthWest' | 'NorthEast' | 'SouthWest' | 'SouthEast';

function ResizeHandles() {
  const triggerResize = async (dir: ResizeDirection) => {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startResizeDragging(dir as any);
    } catch (e) {
      console.warn('startResizeDragging failed:', e);
    }
  };

  const edge = (dir: ResizeDirection, style: React.CSSProperties) => (
    <div
      key={dir}
      onMouseDown={(e) => { e.preventDefault(); triggerResize(dir); }}
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...style,
      }}
    />
  );

  const T = 6;  // thickness of edge handles in px
  const C = 12; // corner handle size in px

  return (
    <>
      {/* Edges */}
      {edge('North',     { top: 0,    left: C,         right: C,        height: T,   cursor: 'n-resize'  })}
      {edge('South',     { bottom: 0, left: C,         right: C,        height: T,   cursor: 's-resize'  })}
      {edge('West',      { left: 0,   top: C,          bottom: C,       width: T,    cursor: 'w-resize'  })}
      {edge('East',      { right: 0,  top: C,          bottom: C,       width: T,    cursor: 'e-resize'  })}
      {/* Corners */}
      {edge('NorthWest', { top: 0,    left: 0,                          width: C, height: C, cursor: 'nw-resize' })}
      {edge('NorthEast', { top: 0,    right: 0,                         width: C, height: C, cursor: 'ne-resize' })}
      {edge('SouthWest', { bottom: 0, left: 0,                          width: C, height: C, cursor: 'sw-resize' })}
      {edge('SouthEast', { bottom: 0, right: 0,                         width: C, height: C, cursor: 'se-resize' })}
    </>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

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

interface HistoryItem {
  title: string;
  url: string;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

export default function Home() {
  // Viewport container ref
  const viewportRef = useRef<HTMLDivElement>(null);

  // Preferences config
  const [homepage, setHomepage] = useState('nova://newtab');
  const [searchEngine, setSearchEngine] = useState<'google' | 'bing' | 'duckduckgo'>('google');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [showBookmarks, setShowBookmarks] = useState(true);

  // Browser state
  const [url, setUrl] = useState('nova://newtab');
  const [pageTitle, setPageTitle] = useState('New Tab');
  const [isNavigating, setIsNavigating] = useState(false);

  // Tab management state
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'New Tab', url: 'nova://newtab', history: ['nova://newtab'], historyIndex: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');

  // Bookmark management state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'GitHub', url: 'https://www.github.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'Reddit', url: 'https://www.reddit.com' },
  ]);

  // History tracking state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // User Profile configuration
  const [user, setUser] = useState<UserProfile | null>(null);

  // Sidebar shortcuts state
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarShortcuts, setSidebarShortcuts] = useState<{ name: string; url: string }[]>([
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'Instagram', url: 'https://www.instagram.com' },
    { name: 'Discord', url: 'https://discord.com' },
    { name: 'Telegram', url: 'https://web.telegram.org' },
    { name: 'Facebook', url: 'https://www.facebook.com' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com' },
  ]);
  const [showAddSidebarModal, setShowAddSidebarModal] = useState(false);
  const [newSidebarName, setNewSidebarName] = useState('');
  const [newSidebarUrl, setNewSidebarUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  // Agent Sidebar states
  const [isAgentSidebarOpen, setIsAgentSidebarOpen] = useState(true);
  const [agentSidebarWidth, setAgentSidebarWidth] = useState(340);
  const [isResizingAgentSidebar, setIsResizingAgentSidebar] = useState(false);

  // AI Configuration states
  const [aiProvider, setAiProvider] = useState('groq');
  const [aiModel, setAiModel] = useState('llama-3.3-70b-versatile');
  const [aiApiKey, setAiApiKey] = useState('');

  // Dynamic interactive agent chat states
  interface AgentMessage {
    id: string;
    sender: 'user' | 'agent';
    content: string;
    timestamp: Date;
  }

  interface ChatSession {
    id: string;
    title: string;
    messages: AgentMessage[];
    createdAt: string;
  }

  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInputValue, setAgentInputValue] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Chat Session states
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Load chat sessions from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nova-agent-sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          const formatted = parsed.map((s: any) => ({
            ...s,
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }));
          setChatSessions(formatted);
          setActiveSessionId(formatted[0].id);
          setAgentMessages(formatted[0].messages);
          return;
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    
    // Initial session if none found
    const initialId = `session-${Date.now()}`;
    const initialSession: ChatSession = {
      id: initialId,
      title: 'Welcome Session',
      messages: [
        {
          id: 'welcome',
          sender: 'agent',
          content: "Hi, I'm N.O.V.A. Agent. I can help you audit security, extract lists, or summarize documents. Choose an action below or ask me anything:",
          timestamp: new Date(),
        }
      ],
      createdAt: new Date().toISOString()
    };
    setChatSessions([initialSession]);
    setActiveSessionId(initialId);
    setAgentMessages(initialSession.messages);
  }, []);

  // Sync active session changes to local storage
  useEffect(() => {
    if (chatSessions.length === 0 || !activeSessionId || agentMessages.length === 0) return;

    setChatSessions(prev => {
      let isChanged = false;
      const updated = prev.map(session => {
        if (session.id === activeSessionId) {
          const msgIds = session.messages.map(m => m.id).join(',');
          const activeMsgIds = agentMessages.map(m => m.id).join(',');
          if (msgIds !== activeMsgIds) {
            isChanged = true;
            let newTitle = session.title;
            if (newTitle === 'Welcome Session' || newTitle === 'New Chat') {
              const firstUserMsg = agentMessages.find(m => m.sender === 'user');
              if (firstUserMsg) {
                newTitle = firstUserMsg.content.slice(0, 26) + (firstUserMsg.content.length > 26 ? '...' : '');
              }
            }
            return {
              ...session,
              title: newTitle,
              messages: agentMessages
            };
          }
        }
        return session;
      });

      if (isChanged) {
        localStorage.setItem('nova-agent-sessions', JSON.stringify(updated));
      }
      return updated;
    });
  }, [agentMessages, activeSessionId, chatSessions]);

  const handleSendAgentMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    const updatedMessages = [...agentMessages, userMsg];
    setAgentMessages(updatedMessages);
    setAgentInputValue('');
    setIsAgentTyping(true);

    if (!aiApiKey.trim()) {
      const fallbackMsg: AgentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: `⚠️ **No API Key Configured**\n\nTo use the N.O.V.A. Copilot, please configure your AI provider and API key in **Settings** (nova://settings).\n\nSupported providers:\n• **Groq** — console.groq.com\n• **OpenRouter** — openrouter.ai/keys\n• **OpenAI** — platform.openai.com`,
        timestamp: new Date(),
      };
      setAgentMessages([...updatedMessages, fallbackMsg]);
      setIsAgentTyping(false);
      return;
    }

    try {
      const systemPrompt = `You are N.O.V.A. Copilot, an AI assistant integrated into a desktop web browser called N.O.V.A. (No-DOM Orchestrated Visual Agent). You help users understand, audit, and interact with webpages.\n\nCurrent browser context:\n- Active page title: "${pageTitle || 'New Tab'}"\n- Active page URL: ${url}\n\nBe concise, helpful, and format responses with markdown when useful. Use bullet points and bold for key information.`;

      const response = await callLlmApi(
        aiProvider,
        aiApiKey,
        aiModel,
        text.trim(),
        systemPrompt
      );

      const agentReply: AgentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: response,
        timestamp: new Date(),
      };
      setAgentMessages(prev => [...prev, agentReply]);
    } catch (err: any) {
      const errorMsg: AgentMessage = {
        id: `error-${Date.now()}`,
        sender: 'agent',
        content: `❌ **API Error**\n\n${err?.toString() || 'An unknown error occurred.'}\n\nPlease check your API key and model configuration in Settings.`,
        timestamp: new Date(),
      };
      setAgentMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAgentTyping(false);
    }
  };

  const handleNewConversation = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'agent',
          content: "Hi, I'm N.O.V.A. Agent. I can help you audit security, extract lists, or summarize documents. Choose an action below or ask me anything:",
          timestamp: new Date(),
        }
      ],
      createdAt: new Date().toISOString()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setAgentMessages(newSession.messages);
    setAgentInputValue('');
    setIsAgentTyping(false);
    setShowHistory(false);
  };

  const handleLoadSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setAgentMessages(session.messages);
      setShowHistory(false);
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chatSessions.filter(s => s.id !== sessionId);
    setChatSessions(updated);
    localStorage.setItem('nova-agent-sessions', JSON.stringify(updated));

    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setAgentMessages(updated[0].messages);
      } else {
        const newId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: newId,
          title: 'Welcome Session',
          messages: [
            {
              id: `welcome-${Date.now()}`,
              sender: 'agent',
              content: "Hi, I'm N.O.V.A. Agent. I can help you audit security, extract lists, or summarize documents. Choose an action below or ask me anything:",
              timestamp: new Date(),
            }
          ],
          createdAt: new Date().toISOString()
        };
        setChatSessions([newSession]);
        setActiveSessionId(newId);
        setAgentMessages(newSession.messages);
      }
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, isAgentTyping]);

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, lineIdx) => {
      const parts = line.split('**');
      const formattedLine = parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return <strong key={idx} className="font-bold text-white">{part}</strong>;
        }
        return part;
      });
      return (
        <div key={lineIdx} className={lineIdx > 0 ? "mt-1.5" : ""}>
          {formattedLine}
        </div>
      );
    });
  };

  const renderMessageContent = (content: string) => {
    if (content.includes('```')) {
      const parts = content.split('```');
      return parts.map((part, idx) => {
        if (idx % 2 === 1) {
          const lines = part.split('\n');
          const language = lines[0] || 'code';
          const codeText = lines.slice(1).join('\n');
          return (
            <div key={idx} className="my-2.5 bg-black/40 border border-zinc-800/80 rounded-lg p-2.5 font-mono text-[9.5px] text-indigo-300 overflow-x-auto leading-relaxed select-text">
              <div className="flex justify-between items-center text-[7.5px] font-extrabold uppercase tracking-widest text-zinc-500 mb-1.5 pb-1 border-b border-zinc-900/60 select-none">
                <span>{language}</span>
                <span className="text-[7px] text-zinc-650">ReadOnly</span>
              </div>
              <pre>{codeText}</pre>
            </div>
          );
        }
        return <div key={idx}>{renderFormattedText(part)}</div>;
      });
    }
    return renderFormattedText(content);
  };

  // isMobile: set ONLY after mount to avoid hydration mismatch (no typeof window in render)
  const [isMobile, setIsMobile] = useState(false);

  // New tab Google Search Suggestions state
  const [newTabSearchVal, setNewTabSearchVal] = useState('');
  const [newTabSuggestions, setNewTabSuggestions] = useState<{ type: string; title: string; url?: string }[]>([]);
  const [isNewTabSearchFocused, setIsNewTabSearchFocused] = useState(false);
  const [newTabFocusedIndex, setNewTabFocusedIndex] = useState(-1);

  // Speed Dial shortcuts configuration
  const [speedDials, setSpeedDials] = useState([
    { name: 'Behance | LEDO', url: 'https://www.behance.net', brand: 'behance', color: '#0057ff' },
    { name: 'Dribbble | LEDO', url: 'https://dribbble.com', brand: 'dribbble', color: '#ea4c89' },
    { name: 'Figma | LEDO', url: 'https://www.figma.com', brand: 'figma', color: '#a259ff' },
    { name: 'Instagram', url: 'https://www.instagram.com', brand: 'instagram', color: '#e1306c' },
    { name: 'Pinterest', url: 'https://www.pinterest.com', brand: 'pinterest', color: '#bd081c' },
    { name: 'Snapchat', url: 'https://www.snapchat.com', brand: 'snapchat', color: '#fffc00' },
    { name: 'TikTok', url: 'https://www.tiktok.com', brand: 'tiktok', color: '#ffffff' },
  ]);
  const [showAddShortcutModal, setShowAddShortcutModal] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');

  // Load preferences from local storage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('nova-theme') as any) || 'system';
    const savedHomepage = localStorage.getItem('nova-homepage') || 'nova://newtab';
    const savedSearchEngine = (localStorage.getItem('nova-searchengine') as any) || 'google';
    const savedShowBookmarks = localStorage.getItem('nova-show-bookmarks') !== 'false';
    const savedHistory = localStorage.getItem('nova-history');
    const savedUser = localStorage.getItem('nova-user');
    
    const savedShowSidebar = localStorage.getItem('nova-show-sidebar') !== 'false';
    const savedSidebarShortcuts = localStorage.getItem('nova-sidebar-shortcuts');
    
    // Load AI configuration
    const savedAiProvider = localStorage.getItem('nova-ai-provider') || 'groq';
    const savedAiModel = localStorage.getItem('nova-ai-model') || 'llama-3.3-70b-versatile';
    const savedAiApiKey = localStorage.getItem('nova-ai-apikey') || '';
    setAiProvider(savedAiProvider);
    setAiModel(savedAiModel);
    setAiApiKey(savedAiApiKey);
    
    setTheme(savedTheme);
    setHomepage(savedHomepage);
    setSearchEngine(savedSearchEngine);
    setShowBookmarks(savedShowBookmarks);
    setShowSidebar(savedShowSidebar);
    
    if (savedSidebarShortcuts) {
      setSidebarShortcuts(JSON.parse(savedSidebarShortcuts));
    }
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Default load to homepage
    setUrl(savedHomepage);
    setTabs([{ id: '1', title: getTitleForUrl(savedHomepage), url: savedHomepage, history: [savedHomepage], historyIndex: 0 }]);
    applyTheme(savedTheme);
    setIsMounted(true);
    // Set initial mobile state after mount
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Mobile viewport listener — update isMobile on resize (safe: runs client-side only)
  useEffect(() => {
    if (!isMounted) return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMounted]);

  // Fetch real-time Google search suggestions for the New Tab input
  useEffect(() => {
    const q = newTabSearchVal.trim();
    if (!q) {
      setNewTabSuggestions([]);
      setNewTabFocusedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const suggestions = await getGoogleSuggestions(q);
        const fetched = suggestions.slice(0, 6).map((s: string) => {
          const isUrl = s.endsWith('.com') || s.endsWith('.org') || s.endsWith('.net') || s.startsWith('www.');
          return {
            type: isUrl ? 'url' : 'search',
            title: s,
            url: isUrl ? (s.startsWith('http') ? s : `https://${s}`) : undefined
          };
        });
        setNewTabSuggestions(fetched);
      } catch (err) {
        console.error('New Tab suggestion error:', err);
      }
      setNewTabFocusedIndex(-1);
    }, 150);

    return () => clearTimeout(timer);
  }, [newTabSearchVal]);

  // Sync sidebar shortcuts to local storage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('nova-sidebar-shortcuts', JSON.stringify(sidebarShortcuts));
    }
  }, [sidebarShortcuts, isMounted]);

  const handleShowSidebarChange = (val: boolean) => {
    setShowSidebar(val);
    localStorage.setItem('nova-show-sidebar', String(val));
  };

  // Theme Applier
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

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('nova-theme', newTheme);
    applyTheme(newTheme);
  };

  const handleHomepageChange = (newHomepage: string) => {
    setHomepage(newHomepage);
    localStorage.setItem('nova-homepage', newHomepage);
  };

  const handleSearchEngineChange = (newEngine: 'google' | 'bing' | 'duckduckgo') => {
    setSearchEngine(newEngine);
    localStorage.setItem('nova-searchengine', newEngine);
  };

  const handleAiProviderChange = (provider: string) => {
    setAiProvider(provider);
    localStorage.setItem('nova-ai-provider', provider);
  };

  const handleAiModelChange = (model: string) => {
    setAiModel(model);
    localStorage.setItem('nova-ai-model', model);
  };

  const handleAiApiKeyChange = (key: string) => {
    setAiApiKey(key);
    localStorage.setItem('nova-ai-apikey', key);
  };

  const handleShowBookmarksChange = (val: boolean) => {
    setShowBookmarks(val);
    localStorage.setItem('nova-show-bookmarks', val.toString());
  };

  // Sync with System theme preferences changes dynamically
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Dynamic bounds sync or hide child native browser webview
  const syncWebviewBounds = () => {
    if (!viewportRef.current) return;

    if (url.startsWith('nova://')) {
      // Collapse native viewport layout size to hide the native webview completely
      resizeBrowserWebview(0, 0, 0, 0);
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    
    // Scale logical client bounds to absolute physical screen pixels
    resizeBrowserWebview(
      rect.left * dpr,
      rect.top * dpr,
      rect.width * dpr,
      rect.height * dpr
    );
  };

  // Run bounds synchronization when viewport constraints change
  useEffect(() => {
    if (!isTauri()) return;

    const timer = setTimeout(syncWebviewBounds, 120);

    const observer = new ResizeObserver(() => {
      syncWebviewBounds();
    });

    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }

    window.addEventListener('resize', syncWebviewBounds);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', syncWebviewBounds);
    };
  }, [url]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingAgentSidebar(true);
  };

  // Agent Sidebar Resize Handler
  useEffect(() => {
    if (!isResizingAgentSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 260 && newWidth <= 600) {
        setAgentSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingAgentSidebar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingAgentSidebar]);

  // Poller to update React URL and Title states when navigating inside WebKitGTK directly
  useEffect(() => {
    if (!isTauri() || url.startsWith('nova://')) return;

    const interval = setInterval(async () => {
      try {
        const activeUrl = await getPageUrl();
        const activeTitle = await getPageTitle();
        
        if (activeUrl && activeUrl !== url && !activeUrl.startsWith('nova://')) {
          setUrl(activeUrl);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: activeUrl } : t));
          addToHistory(activeTitle || activeUrl, activeUrl);
        }
        if (activeTitle && activeTitle !== pageTitle) {
          setPageTitle(activeTitle);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: activeTitle } : t));
        }
      } catch (e) {
        // Ignore errors during transition states
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [url, pageTitle, activeTabId]);

  // Helper to parse clean titles for internal pages
  const getTitleForUrl = (targetUrl: string): string => {
    if (targetUrl === 'nova://newtab') return 'New Tab';
    if (targetUrl === 'nova://settings') return 'Settings';
    if (targetUrl === 'nova://history') return 'History';
    if (targetUrl === 'nova://bookmarks') return 'Bookmarks';
    
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return targetUrl;
    }
  };

  // Add search query or URL navigation items to history list
  const addToHistory = (title: string, historyUrl: string) => {
    if (historyUrl.startsWith('nova://')) return;
    
    setHistory(prev => {
      const filtered = prev.filter(item => item.url !== historyUrl);
      const updated = [
        { title: title || historyUrl, url: historyUrl, timestamp: new Date().toISOString() },
        ...filtered
      ].slice(0, 100);
      localStorage.setItem('nova-history', JSON.stringify(updated));
      return updated;
    });
  };

  // Handler for direct browser address bar navigation & search engine routing
  const handleNavigate = async (targetUrl: string) => {
    // If it's a settings click or internal address
    if (targetUrl.startsWith('nova://')) {
      const title = getTitleForUrl(targetUrl);
      setUrl(targetUrl);
      setPageTitle(title);
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          const newHistory = t.history.slice(0, t.historyIndex + 1);
          newHistory.push(targetUrl);
          return {
            ...t,
            url: targetUrl,
            title,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        }
        return t;
      }));
      return;
    }

    setIsNavigating(true);

    const isUrl = targetUrl.match(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/) || targetUrl.startsWith('localhost:');
    let finalUrl = targetUrl;
    if (!isUrl) {
      if (searchEngine === 'google') {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
      } else if (searchEngine === 'bing') {
        finalUrl = `https://www.bing.com/search?q=${encodeURIComponent(targetUrl)}`;
      } else {
        finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(targetUrl)}`;
      }
    }
    
    try {
      const resolvedUrl = await navigateTo(finalUrl);
      setUrl(resolvedUrl);
      
      // Delay slightly for DOM load before title retrieval
      await new Promise((r) => setTimeout(r, 1200));
      const title = await getPageTitle();
      const finalTitle = title || resolvedUrl;
      setPageTitle(finalTitle);

      // Update tabs state
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          const newHistory = t.history.slice(0, t.historyIndex + 1);
          newHistory.push(resolvedUrl);
          return {
            ...t,
            url: resolvedUrl,
            title: finalTitle,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        }
        return t;
      }));
      
      // Track history
      addToHistory(finalTitle, resolvedUrl);
    } catch (err) {
      console.error('Navigation error:', err);
    } finally {
      setIsNavigating(false);
    }
  };

  // Tab controllers
  const handleSwitchTab = async (tabId: string) => {
    setActiveTabId(tabId);
    const targetTab = tabs.find(t => t.id === tabId);
    if (targetTab) {
      setUrl(targetTab.url);
      setPageTitle(targetTab.title);
      
      if (isTauri() && !targetTab.url.startsWith('nova://')) {
        try {
          const currentWebviewUrl = await getPageUrl().catch(() => '');
          const normCurrent = currentWebviewUrl ? currentWebviewUrl.replace(/\/+$/, '').toLowerCase() : '';
          const normTarget = targetTab.url.replace(/\/+$/, '').toLowerCase();
          
          if (normCurrent !== normTarget) {
            setIsNavigating(true);
            await navigateTo(targetTab.url);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsNavigating(false);
        }
      }
    }
  };

  const handleBack = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[newIndex];
      
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          return { ...t, url: prevUrl, historyIndex: newIndex };
        }
        return t;
      }));
      
      setUrl(prevUrl);
      setPageTitle(getTitleForUrl(prevUrl));
      
      if (isTauri()) {
        if (!prevUrl.startsWith('nova://')) {
          navigateTo(prevUrl);
        } else {
          resizeBrowserWebview(0, 0, 0, 0);
        }
      }
    }
  };

  const handleForward = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.historyIndex < activeTab.history.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[newIndex];
      
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          return { ...t, url: nextUrl, historyIndex: newIndex };
        }
        return t;
      }));
      
      setUrl(nextUrl);
      setPageTitle(getTitleForUrl(nextUrl));
      
      if (isTauri()) {
        if (!nextUrl.startsWith('nova://')) {
          navigateTo(nextUrl);
        } else {
          resizeBrowserWebview(0, 0, 0, 0);
        }
      }
    }
  };

  const handleAddTab = () => {
    const newId = Math.random().toString();
    const newTab: Tab = {
      id: newId,
      title: 'New Tab',
      url: homepage,
      history: [homepage],
      historyIndex: 0,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setUrl(homepage);
    setPageTitle(getTitleForUrl(homepage));
    if (isTauri()) {
      resizeBrowserWebview(0, 0, 0, 0); // Hide native browser overlay immediately
    }
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) return;

    const index = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      const nextActiveIndex = index === 0 ? 0 : index - 1;
      handleSwitchTab(newTabs[nextActiveIndex].id);
    }
  };

  const handleAddTabToRight = (tabId: string) => {
    const newId = Math.random().toString();
    const newTab: Tab = {
      id: newId,
      title: 'New Tab',
      url: homepage,
      history: [homepage],
      historyIndex: 0,
    };
    const index = tabs.findIndex(t => t.id === tabId);
    const newTabs = [...tabs];
    newTabs.splice(index + 1, 0, newTab);
    setTabs(newTabs);
    handleSwitchTab(newId);
  };

  const handleDuplicateTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const newId = Math.random().toString();
    const newTab: Tab = {
      id: newId,
      title: tab.title,
      url: tab.url,
      history: [...tab.history],
      historyIndex: tab.historyIndex,
    };
    const index = tabs.findIndex(t => t.id === tabId);
    const newTabs = [...tabs];
    newTabs.splice(index + 1, 0, newTab);
    setTabs(newTabs);
    handleSwitchTab(newId);
  };

  const handleCloseOtherTabs = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    setTabs([tab]);
    handleSwitchTab(tabId);
  };

  const handleCloseTabsToRight = (tabId: string) => {
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;
    const newTabs = tabs.slice(0, index + 1);
    setTabs(newTabs);
    if (!newTabs.some(t => t.id === activeTabId)) {
      handleSwitchTab(tabId);
    }
  };

  const handleCloseTabsToLeft = (tabId: string) => {
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;
    const newTabs = tabs.slice(index);
    setTabs(newTabs);
    if (!newTabs.some(t => t.id === activeTabId)) {
      handleSwitchTab(tabId);
    }
  };

  const handleLogin = () => {
    const mockUser: UserProfile = {
      name: 'Faisal Ahmed',
      email: 'faisal.ahmed@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
    };
    setUser(mockUser);
    localStorage.setItem('nova-user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nova-user');
  };

  // Chrome-like settings open tab logic
  const handleOpenSettings = () => {
    const existingSettingsTab = tabs.find(t => t.url === 'nova://settings');
    if (existingSettingsTab) {
      handleSwitchTab(existingSettingsTab.id);
    } else {
      const newId = Math.random().toString();
      const newTab: Tab = {
        id: newId,
        title: 'Settings',
        url: 'nova://settings',
        history: ['nova://settings'],
        historyIndex: 0,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newId);
      setUrl('nova://settings');
      setPageTitle('Settings');
      if (isTauri()) {
        resizeBrowserWebview(0, 0, 0, 0);
      }
    }
  };

  // Bookmark controller
  const isBookmarked = bookmarks.some(b => b.url === url);
  const handleToggleBookmark = () => {
    if (isBookmarked) {
      setBookmarks(prev => prev.filter(b => b.url !== url));
    } else {
      setBookmarks(prev => [...prev, { name: pageTitle || 'Page', url }]);
    }
  };

  // Custom internal page renderer to mirror Chrome Settings, Bookmarks, and History
  const renderInternalPage = () => {
    if (url === 'nova://newtab') {
      return (
        <div className="w-full h-full bg-[#13131a] text-[#d1d1d6] overflow-y-auto select-none px-4 py-8 md:p-12 transition-colors duration-300 relative">
          <div className="max-w-4xl w-full mx-auto flex flex-col items-center gap-10 animate-in fade-in duration-500">
            
            {/* 1. Spherical SVG Logo */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Outer shadow glow */}
                <div className="absolute inset-0 bg-[#ea4335]/10 rounded-full blur-xl animate-pulse" />
                <svg className="w-20 h-20 relative z-10" viewBox="0 0 100 100" fill="none">
                  <defs>
                    <radialGradient id="novaSphere" cx="65%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#ff7676" />
                      <stop offset="40%" stopColor="#ea4335" />
                      <stop offset="100%" stopColor="#8c1910" />
                    </radialGradient>
                    <filter id="sphereGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#ea4335" floodOpacity="0.3" />
                    </filter>
                  </defs>
                  {/* Sphere body */}
                  <circle cx="50" cy="50" r="42" fill="url(#novaSphere)" filter="url(#sphereGlow)" />
                  {/* Swoosh/Crescent */}
                  <path
                    d="M 22 58 C 22 75 35 84 50 84 C 70 84 82 66 78 48 C 76 38 68 30 58 26 C 68 32 72 44 68 54 C 64 64 52 72 38 72 C 28 72 22 66 22 58 Z"
                    fill="white"
                    opacity="0.95"
                  />
                  {/* Little highlight dot */}
                  <circle cx="68" cy="32" r="3" fill="white" opacity="0.4" />
                </svg>
              </div>
            </div>

            {/* 2. Security status badges row */}
            <div className="flex items-center gap-6 text-xs font-semibold text-zinc-400">
              <div className="flex items-center gap-1.5 hover:text-white transition-colors duration-150 cursor-help" title="Confidential & anonymous web queries">
                <Eye className="w-4 h-4 text-zinc-500" />
                <span>Confidential Search</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors duration-150 cursor-help" title="Active background tracker blocking enabled">
                <Shield className="w-4 h-4 text-[#78a2e1]" />
                <span>Tracker Blocking</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors duration-150 cursor-help" title="Automatic SSL secure connections forced">
                <Lock className="w-4 h-4 text-zinc-500" />
                <span>Web site encryption</span>
              </div>
            </div>

            {/* 3. Search Bar form with Google Search Suggestions */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTabSearchVal.trim()) {
                  handleNavigate(newTabSearchVal.trim());
                  setNewTabSearchVal('');
                }
              }}
              className="w-full max-w-2xl relative"
            >
              <div className="relative flex items-center w-full bg-[#1b1b24] border border-zinc-800/60 rounded-full hover:border-zinc-700 focus-within:border-zinc-600 transition-all shadow-lg p-1.5 pl-5">
                <Search className="w-5 h-5 text-zinc-500 mr-3" />
                <input
                  name="search"
                  type="text"
                  placeholder="What are you looking for today?"
                  autoComplete="off"
                  value={newTabSearchVal}
                  onChange={(e) => setNewTabSearchVal(e.target.value)}
                  onFocus={() => setIsNewTabSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsNewTabSearchFocused(false), 200)}
                  className="flex-grow bg-transparent text-sm text-white placeholder-zinc-500 outline-none w-full"
                />
                
                {/* Lens and Voice/Mic Icons */}
                <div className="flex items-center gap-3.5 mr-4 text-zinc-400">
                  <button type="button" className="hover:text-white transition-colors" title="Google Lens">
                    <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </button>
                  <button type="button" className="hover:text-white transition-colors" title="Voice Search">
                    <Mic className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Ho-ho-ho Red Search Pill Button */}
                <button
                  type="submit"
                  className="bg-[#ea4335] hover:bg-[#d93025] active:scale-95 text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all shadow-md shadow-[#ea4335]/15"
                >
                  "Ho-ho-ho" Search
                </button>
              </div>

              {/* Real-time Google Search Suggestions Overlay */}
              {isNewTabSearchFocused && newTabSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1b1b24] border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="py-2">
                    {newTabSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (suggestion.url) {
                            handleNavigate(suggestion.url);
                          } else {
                            handleNavigate(suggestion.title);
                          }
                          setNewTabSearchVal('');
                        }}
                        className="w-full px-5 py-3 hover:bg-white/5 flex items-center gap-3.5 text-left transition-colors group"
                      >
                        {suggestion.type === 'url' ? (
                          <Globe className="w-4.5 h-4.5 text-blue-400 group-hover:text-blue-300" />
                        ) : (
                          <Search className="w-4.5 h-4.5 text-zinc-400 group-hover:text-white" />
                        )}
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                          {suggestion.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* 4. Speed Dial Grid (Super premium cards matching mockup exactly) */}
            <div className="w-full max-w-3xl mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                
                {/* 1. Behance Card */}
                <div
                  onClick={() => handleNavigate('https://www.behance.net')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0057ff] flex items-center justify-center text-white shadow-md mb-3">
                    <span className="font-extrabold text-xl select-none">Bē</span>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    Behance | LEDO
                  </span>
                </div>

                {/* 2. Dribbble Card */}
                <div
                  onClick={() => handleNavigate('https://dribbble.com')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ea4c89] flex items-center justify-center text-white shadow-md mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-12.513c-.37-.093-3.21-.77-6.534-.356.657 1.77 1.345 3.526 2.03 5.2.148-.1.3-.207.452-.315 2.576-1.83 3.903-4.225 4.053-4.53zm-2.057 6.438c-.147-.367-.78-1.996-1.428-3.712-3.056.81-6.175.76-9.155.088-.047.112-.093.228-.138.345-.882 2.37-1.7 4.985-2.008 7.37C9.378 23.47 11.233 24 12 24c3.486 0 6.643-1.523 8.847-3.935-1.144-.814-1.92-1.47-1.96-1.513zm-8.878 3.863c.273-2.18.995-4.636 1.79-6.868-2.617-.674-5.32-.47-8.083.568.583 2.76 2.457 5.093 4.957 6.136.433-.186.877-.373 1.336-.57zM2.08 13.565c2.585-.823 5.1-.967 7.5-.503.262-.647.51-1.314.737-1.98C6.91 9.775 4.148 9.387.27 9.877c-.173.684-.27 1.4-.27 2.123 0 .53.054 1.05.158 1.565.688-.008 1.343.003 1.923.003zm.74-5.267c3.553-.497 6.176-.02 8.766 1.066.386-.888.723-1.785.992-2.67-2.65-.968-5.394-1.176-8.243-.493-.728.324-1.393.754-1.98 1.277.126.27.28.536.465.82zM12 0C9.697 0 7.512.647 5.64 1.77c2.615-.6 5.127-.417 7.562.482.493-1.077.925-2.22 1.258-3.393A11.854 11.854 0 0 0 12 0zm3.896 2.923c-.318 1.096-.732 2.164-1.206 3.18 3.167.6 6.126.176 8.76-.79C22.25 3.328 19.395 1.545 15.896 2.923z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    Dribbble | LEDO
                  </span>
                </div>

                {/* 3. Figma Card */}
                <div
                  onClick={() => handleNavigate('https://www.figma.com')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1e1e1e] flex items-center justify-center shadow-md mb-3">
                    <svg className="w-5.5 h-8.5" viewBox="0 0 12 18" fill="none">
                      <path d="M3 4.5C3 5.32843 3.67157 6 4.5 6H6V3H4.5C3.67157 3 3 3.67157 3 4.5Z" fill="#F24E1E" />
                      <path d="M3 10.5C3 11.3284 3.67157 12 4.5 12H6V9H4.5C3.67157 9 3 9.67157 3 10.5Z" fill="#A259FF" />
                      <path d="M3 16.5C3 17.3284 3.67157 18 4.5 18C5.32843 18 6 17.3284 6 16.5V15H4.5C3.67157 15 3 15.6716 3 16.5Z" fill="#0ACF83" />
                      <path d="M9 10.5C9 11.3284 8.32843 12 7.5 12H6V9H7.5C8.32843 9 9 9.67157 9 10.5Z" fill="#1ABC9C" />
                      <path d="M9 4.5C9 5.32843 8.32843 6 7.5 6H6V3H7.5C8.32843 3 9 3.67157 9 4.5Z" fill="#FF7262" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    Figma | LEDO
                  </span>
                </div>

                {/* 4. Instagram Card */}
                <div
                  onClick={() => handleNavigate('https://www.instagram.com')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white shadow-md mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    Instagram
                  </span>
                </div>

                {/* 5. Pinterest Card */}
                <div
                  onClick={() => handleNavigate('https://www.pinterest.com')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#bd081c] flex items-center justify-center text-white shadow-md mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.906 2.17-2.906 1.024 0 1.517.768 1.517 1.686 0 1.028-.654 2.57-.993 3.992-.285 1.197.6 2.175 1.78 2.175 2.136 0 3.779-2.249 3.779-5.494 0-2.872-2.062-4.88-5.005-4.88-3.414 0-5.419 2.561-5.419 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.164 0 7.397 2.967 7.397 6.93 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.622 0 11.99-5.37 11.99-11.986C24.007 5.368 18.64 0 12.017 0z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    Pinterest
                  </span>
                </div>

                {/* 6. Snapchat Card */}
                <div
                  onClick={() => handleNavigate('https://www.snapchat.com')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#fffc00] flex items-center justify-center text-black shadow-md mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.043.056c-1.309.028-2.711.164-3.719.467-1.127.34-2.128.983-2.617 2.083-.497 1.119-.481 2.361-.264 3.535.163.882.474 1.708.776 2.53.072.196.14.398.192.602.084.331.066.697-.042 1.018-.088.261-.266.47-.482.645-.487.394-1.077.63-1.667.87-.584.237-1.229.479-1.579.998-.328.487-.279 1.123-.005 1.599.278.485.765.772 1.258.989.654.288 1.37.457 2.062.637.382.099.78.225 1.144.388.196.088.382.198.544.34.254.223.366.564.335.897-.058.627-.376 1.189-.661 1.745-.499.972-1.054 1.916-1.503 2.915-.227.505-.347 1.071-.168 1.611.179.54.64.921 1.185 1.092.836.262 1.724.316 2.585.344 1.272.042 2.548.01 3.821-.019 1.042-.024 2.102-.078 3.125-.285.556-.112 1.107-.342 1.455-.788.34-.436.388-1.031.25-1.564-.266-1.031-.77-1.996-1.21-2.969-.304-.672-.619-1.349-.806-2.068-.088-.34.02-.693.284-.913.161-.134.343-.235.535-.316.518-.219 1.078-.344 1.62-.518.729-.235 1.517-.505 1.954-1.164.298-.449.336-1.018.109-1.488-.231-.478-.684-.78-1.129-1.009-.705-.362-1.467-.621-2.227-.882-.416-.143-.88-.318-1.144-.663-.16-.209-.232-.472-.22-.738.018-.403.149-.785.289-1.16.294-.789.625-1.566.903-2.361.278-.795.545-1.636.524-2.48-.021-.861-.368-1.706-.991-2.3-.967-.923-2.339-1.191-3.619-1.293A47.165 47.165 0 0 0 12.043.056z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    Snapchat
                  </span>
                </div>

                {/* 7. TikTok Card */}
                <div
                  onClick={() => handleNavigate('https://www.tiktok.com')}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group relative shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#000000] flex items-center justify-center text-white shadow-md border border-zinc-850 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.53.02C13.84.01 15.14 0 16.45 0c.08 1.56.84 3.01 2.05 3.93.99.77 2.21 1.22 3.5 1.3v3.19c-1.84-.04-3.62-.75-4.97-2-.25-.23-.46-.49-.66-.76v7.7c0 5.48-4.47 9.94-9.94 9.94-5.48 0-9.94-4.47-9.94-9.94 0-5.48 4.47-9.94 9.94-9.94h.61c.01 1.63.15 3.25.43 4.85-.29.09-.58.2-.85.35-1.89 1.05-2.73 3.32-1.92 5.34.69 1.71 2.45 2.76 4.29 2.62 2.3-.17 3.99-2.24 3.73-4.52-.01-1-.02-1.99-.02-2.99.01-4.22-.01-8.45.01-12.67z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white truncate w-full text-center">
                    TikTok
                  </span>
                </div>

                {/* 8. Add Custom Card */}
                <div
                  onClick={() => {
                    setNewShortcutName('');
                    setNewShortcutUrl('');
                    setShowAddShortcutModal(true);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#1b1b24]/40 hover:bg-[#20202d]/60 border border-zinc-800/30 hover:border-zinc-700/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer h-32 group shadow-md shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800/40 group-hover:bg-zinc-800 flex items-center justify-center mb-3 transition-colors text-zinc-400 group-hover:text-white shadow-inner">
                    <Plus className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-zinc-400 group-hover:text-white">
                    Add
                  </span>
                </div>

              </div>
            </div>

            {/* 5. Top Stories section */}
            <div className="w-full max-w-4xl mt-6 flex flex-col gap-5 text-left">
              <h2 className="text-xl font-bold tracking-tight text-white">Top Stories</h2>
              
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-5 py-2.5 text-xs font-bold rounded-full bg-[#a0c3ff] text-[#0f0f15] transition-all shadow-md">
                  All
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>📰</span>
                  <span>Top Stories</span>
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>🏥</span>
                  <span>Health</span>
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>🌤️</span>
                  <span>Weather</span>
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>🍽️</span>
                  <span>Dining</span>
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>🎬</span>
                  <span>Entertainment</span>
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>✈️</span>
                  <span>Travel</span>
                </button>
                <button className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#1b1b24]/60 text-zinc-400 hover:text-white border border-zinc-800/30 hover:bg-[#1b1b24] transition-all flex items-center gap-2">
                  <span>🟢</span>
                  <span>Sports</span>
                </button>
              </div>

              {/* Grid of stories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
                {/* Story 1 */}
                <div
                  onClick={() => handleNavigate('https://www.behance.net')}
                  className="rounded-2xl overflow-hidden bg-[#1b1b24] border border-zinc-800/30 hover:border-zinc-700/60 cursor-pointer group shadow-lg transition-all duration-300"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=500&q=80"
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b24] to-transparent opacity-60" />
                  </div>
                  <div className="p-5 flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#ea4335]">Trends</span>
                    <h3 className="text-sm font-bold leading-snug text-white group-hover:text-[#a0c3ff] transition-colors">
                      Dynamic Abstract Design Trends in Digital Art for 2026
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      Discover the latest movements in liquid 3D gradients, glassmorphism UI layouts, and brutalist typography.
                    </p>
                  </div>
                </div>

                {/* Story 2 */}
                <div
                  onClick={() => handleNavigate('https://www.nationalgeographic.com')}
                  className="rounded-2xl overflow-hidden bg-[#1b1b24] border border-zinc-800/30 hover:border-zinc-700/60 cursor-pointer group shadow-lg transition-all duration-300"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=80"
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b24] to-transparent opacity-60" />
                  </div>
                  <div className="p-5 flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-green-400">Adventure</span>
                    <h3 className="text-sm font-bold leading-snug text-white group-hover:text-[#a0c3ff] transition-colors">
                      Breathtaking Travel Destinations Off the Beaten Path
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      Explore remote mountain valleys, hidden coastal villages, and untamed natural parks around the globe.
                    </p>
                  </div>
                </div>

                {/* Story 3 */}
                <div
                  onClick={() => handleNavigate('https://www.tesla.com')}
                  className="rounded-2xl overflow-hidden bg-[#1b1b24] border border-zinc-800/30 hover:border-zinc-700/60 cursor-pointer group shadow-lg transition-all duration-300"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=500&q=80"
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b24] to-transparent opacity-60" />
                  </div>
                  <div className="p-5 flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Automotive</span>
                    <h3 className="text-sm font-bold leading-snug text-white group-hover:text-[#a0c3ff] transition-colors">
                      The Future of Electric Sports Cars and Advanced Battery Tech
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      How automotive engineers are squeezing hypercar performance and 600-mile ranges out of next-gen solid state cells.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* 7. Fully Functional Add Shortcut Modal Overlay */}
          {showAddShortcutModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
              <div className="bg-[#1b1b24] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 shadow-2xl animate-in scale-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Add Shortcut</h3>
                  <button
                    onClick={() => setShowAddShortcutModal(false)}
                    className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Google"
                      value={newShortcutName}
                      onChange={(e) => setNewShortcutName(e.target.value)}
                      className="bg-[#13131a] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 outline-none w-full transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={newShortcutUrl}
                      onChange={(e) => setNewShortcutUrl(e.target.value)}
                      className="bg-[#13131a] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 outline-none w-full transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setShowAddShortcutModal(false)}
                    className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newShortcutName.trim() && newShortcutUrl.trim()) {
                        let finalUrl = newShortcutUrl.trim();
                        if (!/^https?:\/\//i.test(finalUrl)) {
                          finalUrl = `https://${finalUrl}`;
                        }
                        setSpeedDials(prev => [
                          ...prev,
                          {
                            name: newShortcutName.trim(),
                            url: finalUrl,
                            brand: 'custom',
                            color: '#78a2e1',
                          }
                        ]);
                        setShowAddShortcutModal(false);
                      } else {
                        alert('Please fill in both name and URL fields.');
                      }
                    }}
                    className="px-4 py-2 text-xs font-bold bg-[#ea4335] hover:bg-[#d93025] text-white rounded-xl transition-all shadow-md shadow-[#ea4335]/15"
                  >
                    Add Shortcut
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    if (url === 'nova://settings') {
      return (
        <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto p-8 select-none text-sm animate-in fade-in duration-300">
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-8 pb-16">
            <h1 className="text-xl font-bold tracking-tight border-b border-zinc-200/60 dark:border-zinc-800/80 pb-4">Settings</h1>
            
            {/* Bookmarks Bar Visibility Toggle */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Bookmarks Bar</h2>
              <p className="text-xs text-zinc-500">Toggle whether the bookmarks bar is visible below the address bar.</p>
              <button
                onClick={() => handleShowBookmarksChange(!showBookmarks)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border w-fit transition-all ${
                  showBookmarks
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {showBookmarks ? 'Shown' : 'Hidden'}
              </button>
            </div>

            {/* Sidebar Shortcuts Visibility Toggle */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Sidebar Shortcuts</h2>
              <p className="text-xs text-zinc-500">Toggle whether the floating app shortcuts are visible on the left side of the screen.</p>
              <button
                onClick={() => handleShowSidebarChange(!showSidebar)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border w-fit transition-all ${
                  showSidebar
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-305 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {showSidebar ? 'Shown' : 'Hidden'}
              </button>
            </div>

            {/* Search Engine Config */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Search Engine</h2>
              <p className="text-xs text-zinc-500">Choose which search engine is used when you search from the address bar.</p>
              <div className="flex gap-2 mt-1">
                {(['google', 'bing', 'duckduckgo'] as const).map((engine) => (
                  <button
                    key={engine}
                    onClick={() => handleSearchEngineChange(engine)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      searchEngine === engine
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-355 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {engine.charAt(0).toUpperCase() + engine.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Homepage URL */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Default Startup Page</h2>
              <p className="text-xs text-zinc-500">Set the default page URL loaded when creating a new tab (e.g. nova://newtab, google.com).</p>
              <input
                type="text"
                value={homepage}
                onChange={(e) => handleHomepageChange(e.target.value)}
                placeholder="nova://newtab"
                className="w-full max-w-md h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all"
              />
            </div>

            {/* Theme Config */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Appearance Theme</h2>
              <p className="text-xs text-zinc-500">Select how the N.O.V.A. browser frame matches your operating system theme.</p>
              <div className="flex gap-2 mt-1">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      theme === t
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Omniscient Configuration */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                AI Omniscient Configuration
              </h2>
              <p className="text-xs text-zinc-500">Configure which AI provider powers the N.O.V.A. Copilot sidebar assistant.</p>
              
              <div className="flex flex-col gap-4 mt-1 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                {/* Provider */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Provider</label>
                  <div className="flex gap-2">
                    {(['groq', 'openrouter', 'openai'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          handleAiProviderChange(p);
                          if (p === 'groq') handleAiModelChange('llama-3.3-70b-versatile');
                          else if (p === 'openrouter') handleAiModelChange('meta-llama/llama-3.3-70b-instruct');
                          else if (p === 'openai') handleAiModelChange('gpt-4o-mini');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          aiProvider === p
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {p === 'groq' ? 'Groq' : p === 'openrouter' ? 'OpenRouter' : 'OpenAI'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Model</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => handleAiModelChange(e.target.value)}
                    placeholder="e.g. llama-3.3-70b-versatile"
                    className="w-full max-w-md h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all"
                  />
                </div>

                {/* API Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">API Key</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => handleAiApiKeyChange(e.target.value)}
                    placeholder="sk-..."
                    className="w-full max-w-md h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    {aiProvider === 'groq' && 'Get your key from console.groq.com'}
                    {aiProvider === 'openrouter' && 'Get your key from openrouter.ai/keys'}
                    {aiProvider === 'openai' && 'Get your key from platform.openai.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* History and Bookmarks resets */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Clear Browsing Data</h2>
              <p className="text-xs text-zinc-500">Wipe clean all custom history records and bookmarked pages stored locally in your session.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('nova-history');
                    alert('Browsing history wiped.');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-transparent hover:border-red-500/20 transition-all"
                >
                  Clear History
                </button>
                <button
                  onClick={() => {
                    setBookmarks([]);
                    alert('Bookmarks wiped.');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-300/40 dark:border-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all"
                >
                  Reset Bookmarks
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (url === 'nova://history') {
      return (
        <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto p-8 select-none text-sm animate-in fade-in duration-300">
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/80 pb-4">
              <h1 className="text-xl font-bold tracking-tight">History</h1>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('nova-history');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Clear all history
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-650 gap-2">
                <Globe className="w-8 h-8 opacity-30" />
                <span className="text-xs">No browser history recorded yet</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((item, idx) => {
                  let hostname = 'unknown';
                  try { hostname = new URL(item.url).hostname; } catch {}
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-850/40 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <img 
                          src={`https://www.google.com/s2/favicons?sz=32&domain=${hostname}`} 
                          alt="" 
                          className="w-3.5 h-3.5 rounded-xs flex-shrink-0" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                        />
                        <button 
                          onClick={() => handleNavigate(item.url)} 
                          className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-indigo-500 truncate hover:underline text-left"
                        >
                          {item.title}
                        </button>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600 truncate">{item.url}</span>
                      </div>
                      <button
                        onClick={() => {
                          const updated = history.filter((_, i) => i !== idx);
                          setHistory(updated);
                          localStorage.setItem('nova-history', JSON.stringify(updated));
                        }}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (url === 'nova://bookmarks') {
      return (
        <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto p-8 select-none text-sm animate-in fade-in duration-300">
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-6">
            <h1 className="text-xl font-bold tracking-tight border-b border-zinc-200/60 dark:border-zinc-800/80 pb-4">Bookmarks</h1>

            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-650 gap-2">
                <Star className="w-8 h-8 opacity-30" />
                <span className="text-xs">No bookmarks saved yet</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {bookmarks.map((bookmark, idx) => {
                  let hostname = 'unknown';
                  try { hostname = new URL(bookmark.url).hostname; } catch {}
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-850/40 hover:border-indigo-500/20 hover:shadow-xs transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <img 
                          src={`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`} 
                          alt="" 
                          className="w-4 h-4 rounded-xs flex-shrink-0" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                        />
                        <div className="flex flex-col overflow-hidden">
                          <button 
                            onClick={() => handleNavigate(bookmark.url)} 
                            className="text-xs font-semibold text-zinc-800 dark:text-zinc-150 hover:text-indigo-500 truncate hover:underline text-left"
                          >
                            {bookmark.name}
                          </button>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-650 truncate">{bookmark.url}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setBookmarks(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Delete Bookmark"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#13131a] font-sans text-zinc-150 antialiased transition-colors duration-300">
      <ResizeHandles />
      
      <BrowserToolbar
        url={url}
        pageTitle={pageTitle}
        isNavigating={isNavigating}
        onNavigate={handleNavigate}
        onOpenSettings={handleOpenSettings}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={() => handleNavigate(url)}
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={handleSwitchTab}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
        bookmarks={bookmarks}
        onToggleBookmark={handleToggleBookmark}
        isBookmarked={isBookmarked}
        showBookmarks={showBookmarks}
        theme={theme}
        onThemeChange={handleThemeChange}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isAgentSidebarOpen={isAgentSidebarOpen}
        onToggleAgentSidebar={() => setIsAgentSidebarOpen(prev => !prev)}
        onAddTabToRight={handleAddTabToRight}
        onDuplicateTab={handleDuplicateTab}
        onCloseOtherTabs={handleCloseOtherTabs}
        onCloseTabsToRight={handleCloseTabsToRight}
        onCloseTabsToLeft={handleCloseTabsToLeft}
      />

      {/* Sidebar + Viewport Layout */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        
        {/* Viewport container */}
        <div 
          ref={viewportRef}
          className="flex-grow h-full relative bg-[#13131a] overflow-hidden"
        >
          {/* Render internal page component if the URL matches internal schematics */}
          {url.startsWith('nova://') ? (
            renderInternalPage()
          ) : (
            isNavigating && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#13131a]/40 backdrop-blur-xs z-50">
                <div className="w-8.5 h-8.5 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )
          )}

          {/* Floating Sidebar Shortcuts Overlay — hidden on mobile (hydration-safe: gated by isMounted) */}
          {showSidebar && isMounted && !isMobile && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4.5 z-40 select-none">
              {/* List of custom/editable app shortcuts */}
              <div className="flex flex-col gap-3.5">
                {sidebarShortcuts.map((shortcut, idx) => {
                  let hostname = '';
                  try {
                    hostname = new URL(shortcut.url).hostname;
                  } catch (e) {}

                  return (
                    <div key={idx} className="relative group w-10 h-10 flex items-center justify-center">
                      <button
                        onClick={() => handleNavigate(shortcut.url)}
                        className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all duration-200 hover:scale-115 active:scale-95"
                        title={shortcut.name}
                      >
                        {hostname ? (
                          <img 
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`} 
                            alt="" 
                            className="w-6.5 h-6.5 object-contain" 
                            onError={(e) => { 
                              e.currentTarget.style.display = 'none'; 
                              if (e.currentTarget.nextSibling) {
                                (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                              }
                            }} 
                          />
                        ) : null}
                        <span 
                          style={{ display: hostname ? 'none' : 'flex' }}
                          className="w-6.5 h-6.5 text-[10px] font-black text-white items-center justify-center uppercase tracking-wider"
                        >
                          {shortcut.name.slice(0, 2)}
                        </span>
                      </button>
                      
                      {/* Hover delete shortcut button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSidebarShortcuts(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#ea4335] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg hover:scale-110 z-50 cursor-pointer animate-in fade-in"
                        title="Delete Shortcut"
                      >
                        <X className="w-2.5 h-2.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Shortcut Trigger */}
              <button
                onClick={() => setShowAddSidebarModal(true)}
                className="w-10 h-10 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Add Sidebar Shortcut"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <div className="my-0.5" />

              {/* Floating Settings Shortcut Button */}
              <button
                onClick={handleOpenSettings}
                className="w-10 h-10 rounded-full hover:bg-[#ea4335]/15 flex items-center justify-center transition-all duration-200 text-[#ea4335] hover:scale-115 active:scale-95"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Agent Sidebar Container with buttery-smooth width transitions */}
        {isMounted && !isMobile && (
          <div 
            style={{ 
              width: isAgentSidebarOpen ? `${agentSidebarWidth}px` : '30px',
              borderLeftWidth: isAgentSidebarOpen ? '1px' : '0px',
            }}
            className="h-full flex-shrink-0 bg-[#0f0f12] border-zinc-800/50 flex flex-col relative select-none z-35 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out overflow-visible"
          >
            {/* Resize handle (only when open) */}
            {isAgentSidebarOpen && (
              <div
                onMouseDown={startResizing}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/80 transition-colors z-45"
              />
            )}

            {/* Google Gemini-Style Vertical Curved Toggle Handle Tab */}
            <div 
              onClick={() => setIsAgentSidebarOpen(!isAgentSidebarOpen)}
              className="absolute top-[40%] left-0 w-[30px] h-[140px] group cursor-pointer z-50 select-none transition-all hover:scale-105 active:scale-95"
              title={isAgentSidebarOpen ? "Hide Copilot" : "Show Copilot"}
            >
              <svg 
                width="30" 
                height="140" 
                viewBox="0 0 30 140" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]"
              >
                {/* Clean filled organic curve matching sidebar bg */}
                <path 
                  d="M30 0 C30 20 2 30 2 70 C2 110 30 120 30 140 Z" 
                  fill="#0f0f12" 
                />
                {/* Border line on the left curved edge ONLY (right edge has no line to merge seamlessly) */}
                <path 
                  d="M30 0 C30 20 2 30 2 70 C2 110 30 120 30 140" 
                  stroke="#2d2d39" 
                  strokeWidth="1.5"
                />
              </svg>
              {/* Pulsing Bot Agent Icon in place of Arrow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-1">
                <Bot className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors animate-pulse" strokeWidth={2.2} />
              </div>
            </div>

            {/* Fixed width inner container shifted to the right of the handle to prevent overlaps */}
            {isAgentSidebarOpen && (
              <div 
                style={{ width: `${agentSidebarWidth - 30}px`, marginLeft: '30px' }} 
                className="h-full flex flex-col overflow-hidden"
              >
                {showHistory ? (
                  /* --- CHAT HISTORY PANEL LAYOUT --- */
                  <div className="h-full flex flex-col overflow-hidden bg-[#0f0f12]">
                    {/* History Header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-900/60 bg-[#131316]/50">
                      <button
                        onClick={() => setShowHistory(false)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Back to Chat"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[12px] font-bold text-white tracking-wide">Saved Chats</span>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-2 no-scrollbar bg-[#0f0f12]">
                      <button
                        onClick={handleNewConversation}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-600/5 text-zinc-400 hover:text-white rounded-xl text-[10.5px] font-bold transition-all select-none cursor-pointer mb-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Start New Conversation</span>
                      </button>

                      {chatSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => handleLoadSession(session.id)}
                          className={`group w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                            activeSessionId === session.id
                              ? 'bg-indigo-600/10 border border-indigo-500/20 text-white'
                              : 'hover:bg-[#18181c] border border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeSessionId === session.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            <div className="flex flex-col text-left min-w-0">
                              <span className="text-[11px] font-bold truncate leading-tight">{session.title}</span>
                              <span className="text-[8px] text-zinc-650 font-medium">
                                {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-[#ea4335] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                            title="Delete Chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* --- ACTIVE CHAT PANEL LAYOUT --- */
                  <div className="h-full flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f12] border-b border-zinc-900/60">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[11.5px] font-extrabold text-white tracking-wide bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent font-sans">N.O.V.A. Copilot</span>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Active</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowHistory(true)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all cursor-pointer"
                          title="View Saved Chats"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={handleNewConversation}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/35 transition-all cursor-pointer select-none"
                          title="New Chat"
                        >
                          <Plus className="w-3 h-3 text-indigo-400" strokeWidth={3} />
                          <span>New</span>
                        </button>
                      </div>
                    </div>

                    {/* Chat Messages Container */}
                    <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar bg-[#0f0f12]">
                      {agentMessages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                            msg.sender === 'user' ? 'items-end' : 'items-start'
                          }`}
                        >
                          {msg.sender === 'agent' ? (
                            /* Agent Message: Raw text directly on background canvas */
                            <div className="w-full text-left">
                              <div className="flex gap-2 items-center mb-1.5 text-zinc-400 text-[10px] font-bold">
                                <div className="p-1 rounded-lg bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/15">
                                  <Sparkles className="w-3 h-3 text-indigo-400" />
                                </div>
                                <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent font-extrabold uppercase tracking-wider">N.O.V.A. Copilot</span>
                              </div>
                              <div className="pl-6 text-[11.5px] text-zinc-200 leading-relaxed select-text font-sans">
                                {renderMessageContent(msg.content)}
                              </div>
                              <span className="block text-[7.5px] text-zinc-650 font-bold uppercase mt-1 pl-6 tracking-wide select-none">
                                {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            /* User Message: Clean dark grey pill aligned to the right */
                            <div className="max-w-[85%] text-right">
                              <div className="p-3 bg-[#1e1f20] border border-zinc-800/40 rounded-[20px] text-[11.5px] text-[#e3e3e3] text-left leading-relaxed font-sans font-medium shadow-sm">
                                {renderMessageContent(msg.content)}
                              </div>
                              <span className="block text-[7.5px] text-zinc-650 font-bold uppercase mt-1 mr-2 tracking-wide select-none">
                                You • {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Typing status indicator */}
                      {isAgentTyping && (
                        <div className="w-full text-left animate-pulse">
                          <div className="flex gap-2 items-center mb-1.5 text-zinc-500 text-[10px] font-bold">
                            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                              <Bot className="w-3 h-3 animate-pulse text-indigo-400" />
                            </div>
                            <span className="text-zinc-500 font-extrabold uppercase tracking-wider">Copilot is thinking...</span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-6 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-bounce" />
                          </div>
                        </div>
                      )}

                      {/* Prompt templates (only show on fresh welcome screen) */}
                      {agentMessages.length === 1 && (
                        <div className="flex flex-col gap-2 mt-2 pl-6">
                          <span className="text-[8px] text-zinc-600 font-extrabold uppercase tracking-wider select-none">Suggested Prompts</span>
                          <div className="flex flex-col gap-1.5">
                            {[
                              { label: 'Summarize Page', prompt: 'Summarize the key takeaways of this page.' },
                              { label: 'Extract Data', prompt: 'Extract page metadata structure to clean JSON format.' },
                              { label: 'SEO Audit', prompt: 'Analyze the heading structures and meta details of this page.' }
                            ].map((tpl, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendAgentMessage(tpl.prompt)}
                                className="px-3.5 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white bg-[#1e1f20]/40 hover:bg-indigo-600/10 border border-zinc-800/40 hover:border-indigo-500/20 rounded-xl transition-all cursor-pointer text-left w-full shadow-sm"
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Panel (Bottom) */}
                    <div className="p-3 bg-[#0f0f12] border-t border-zinc-900/60 flex flex-col gap-2">
                      <div className="relative flex flex-col bg-[#1e1f20] border border-zinc-800/40 rounded-[22px] px-3.5 py-2.5 focus-within:border-zinc-700 focus-within:shadow-[0_0_12px_rgba(255,255,255,0.02)] transition-all">
                        <textarea
                          rows={2}
                          value={agentInputValue}
                          onChange={(e) => setAgentInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendAgentMessage(agentInputValue);
                            }
                          }}
                          placeholder="Ask N.O.V.A. to analyze or automate..."
                          className="w-full bg-transparent text-[11.5px] text-zinc-200 placeholder-zinc-500 outline-none resize-none font-sans leading-relaxed pr-20 no-scrollbar"
                        />
                        
                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-zinc-900/40">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => alert('Attachments features coming soon!')}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                              title="Upload File"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => alert('Voice typing coming soon!')}
                              className="p-1 rounded text-zinc-400 hover:text-[#ea4335] hover:bg-[#ea4335]/10 transition-all cursor-pointer"
                              title="Voice Input"
                            >
                              <Mic className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleSendAgentMessage(agentInputValue)}
                            disabled={!agentInputValue.trim()}
                            className={`p-1.5 rounded-full transition-all active:scale-95 cursor-pointer ${
                              agentInputValue.trim() 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25' 
                                : 'bg-zinc-800/30 text-zinc-500 cursor-not-allowed border border-zinc-800/30'
                            }`}
                            title="Send Command"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[7.5px] text-zinc-600 text-center font-bold uppercase tracking-widest select-none">
                        N.O.V.A. Browser Copilot v1.0
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Fully Functional Add Sidebar Shortcut Modal Overlay */}
      {showAddSidebarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1b1b24] border border-zinc-850 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 shadow-2xl animate-in scale-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Sidebar Shortcut</h3>
              <button
                onClick={() => {
                  setShowAddSidebarModal(false);
                  setNewSidebarName('');
                  setNewSidebarUrl('');
                }}
                className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Name</label>
                <input
                  type="text"
                  placeholder="e.g. YouTube"
                  value={newSidebarName}
                  onChange={(e) => setNewSidebarName(e.target.value)}
                  className="bg-[#13131a] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 outline-none w-full transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">URL</label>
                <input
                  type="text"
                  placeholder="https://youtube.com"
                  value={newSidebarUrl}
                  onChange={(e) => setNewSidebarUrl(e.target.value)}
                  className="bg-[#13131a] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-650 focus:border-zinc-700 outline-none w-full transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setShowAddSidebarModal(false);
                  setNewSidebarName('');
                  setNewSidebarUrl('');
                }}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newSidebarName.trim() && newSidebarUrl.trim()) {
                    let finalUrl = newSidebarUrl.trim();
                    if (!/^https?:\/\//i.test(finalUrl)) {
                      finalUrl = `https://${finalUrl}`;
                    }
                    setSidebarShortcuts(prev => [
                      ...prev,
                      {
                        name: newSidebarName.trim(),
                        url: finalUrl,
                      }
                    ]);
                    setShowAddSidebarModal(false);
                    setNewSidebarName('');
                    setNewSidebarUrl('');
                  } else {
                    alert('Please fill in both name and URL fields.');
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-[#ea4335] hover:bg-[#d93025] text-white rounded-xl transition-all shadow-md shadow-[#ea4335]/15"
              >
                Add Shortcut
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
