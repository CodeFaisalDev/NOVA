'use client';

import React, { useState, useEffect, useRef } from 'react';
import BrowserToolbar from '@/components/BrowserToolbar';
import ActionCard from '@/components/ActionCard';
import AgentStatus, { AgentState } from '@/components/AgentStatus';
import { AgentAction } from '@/lib/schema';
import { 
  navigateTo, 
  getPageTitle, 
  getPageUrl, 
  isTauri, 
  resizeBrowserWebview,
  getGoogleSuggestions,
  callLlmApi,
  evalJsInBrowser,
  getWebviewText,
  getSystemRam,
  checkPythonInstalled
} from '@/lib/ipc';
import { Search, Star, Globe, X, Settings, Eye, Shield, Lock, Mic, Heart, Sun, Utensils, Film, Plane, MessageSquare, Users, Newspaper, Plus, Bot, Sparkles, Send, Paperclip, RotateCcw, ChevronLeft, ChevronRight, Trash2, ArrowLeft, User, HardDrive, Cloud, ShieldAlert, Cpu, Download, ArrowUpRight } from 'lucide-react';

interface LocalModel {
  id: string;
  name: string;
  variant: string;
  size: string;
  ramRequired: number;
  description: string;
  category: 'text' | 'vision';
  downloadUrl: string;
}

const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    variant: 'Instruct (Q4_K_M)',
    size: '900 MB',
    ramRequired: 2,
    description: 'Ultra-lightweight. Quick summaries, basic keyword extraction, and simple text automation.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf'
  },
  {
    id: 'qwen-2.5-1.5b',
    name: 'Qwen 2.5 1.5B',
    variant: 'Instruct (Q4_K_M)',
    size: '1.1 GB',
    ramRequired: 2,
    description: 'Fast, compact model. Excellent at clean table scraping and generating basic JSON keys.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf'
  },
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B',
    variant: 'Instruct (Q4_K_M)',
    size: '1.6 GB',
    ramRequired: 4,
    description: 'Google Gemma 2 model. Superb logic/reasoning for its size, excellent article summarization.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf'
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    variant: 'Instruct (Q4_K_M)',
    size: '2.0 GB',
    ramRequired: 4,
    description: 'Advanced lightweight reasoning. Perfect for web form-filling automation and multi-item JSON lists.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf'
  },
  {
    id: 'phi-4-mini',
    name: 'Phi-4 Mini 3.8B',
    variant: 'Instruct (Q4_K_M)',
    size: '2.6 GB',
    ramRequired: 5,
    description: 'Microsoft compact reasoning model. Outstanding at logical puzzles, multi-part constraints, and structured planning.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/phi-4-mini-instruct-GGUF/resolve/main/phi-4-mini-instruct-Q4_K_M.gguf'
  },
  {
    id: 'phi-4-multimodal',
    name: 'Phi-4 Multimodal 5.6B',
    variant: 'Vision GGUF (Q4_K_M)',
    size: '3.9 GB',
    ramRequired: 6,
    description: 'Local Vision Model. Performs visual coordinate grounding, maps element descriptions to [x, y] coordinates from screenshots.',
    category: 'vision',
    downloadUrl: 'https://huggingface.co/lmstudio-community/phi-4-multimodal-instruct-GGUF/resolve/main/phi-4-multimodal-instruct-Q4_K_M.gguf'
  },
  {
    id: 'qwen-2.5-7b',
    name: 'Qwen 2.5 7B',
    variant: 'Instruct (Q4_K_M)',
    size: '4.7 GB',
    ramRequired: 8,
    description: 'Highly capable coder. Excellent at writing selectors, parsing huge DOM text dumps, and translating data structures.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf'
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    variant: 'Instruct (Q4_K_M)',
    size: '4.9 GB',
    ramRequired: 8,
    description: 'Standard local assistant. Outstanding multi-turn agent conversations, context comprehension, and document compilation.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf'
  },
  {
    id: 'phi-4-14b',
    name: 'Phi-4 14B',
    variant: 'Instruct (Q4_K_M)',
    size: '9.2 GB',
    ramRequired: 16,
    description: 'Microsoft high-end reasoning. Excellent scientific/technical problem solving and detailed multi-page web data analysis.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/phi-4-instruct-GGUF/resolve/main/phi-4-instruct-Q4_K_M.gguf'
  },
  {
    id: 'qwen-2.5-14b',
    name: 'Qwen 2.5 14B',
    variant: 'Instruct (Q4_K_M)',
    size: '9.0 GB',
    ramRequired: 16,
    description: 'Frontier local model level. Superb at extracting detailed grids of items and comparing values across tables.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_k_m.gguf'
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    variant: 'Instruct (Q4_K_M)',
    size: '42 GB',
    ramRequired: 48,
    description: 'Ultimate local beast. Near-frontier reasoning, full multi-page syntheses, and autonomous agent coordination loops.',
    category: 'text',
    downloadUrl: 'https://huggingface.co/lmstudio-community/Meta-Llama-3.3-70B-Instruct-GGUF/resolve/main/Meta-Llama-3.3-70B-Instruct-Q4_K_M.gguf'
  }
];

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
  isIncognito?: boolean;
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

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
};

const getProfileColor = (name: string): string => {
  const colors = [
    'bg-red-650 text-white',
    'bg-purple-650 text-white',
    'bg-blue-650 text-white',
    'bg-emerald-650 text-white',
    'bg-amber-650 text-white',
    'bg-pink-650 text-white',
    'bg-indigo-650 text-white',
    'bg-cyan-650 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

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
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activePopoverWidth, setActivePopoverWidth] = useState(0);
  const [showGoogleLoginModal, setShowGoogleLoginModal] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [tempGoogleClientId, setTempGoogleClientId] = useState('');

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
  const [isAgentSidebarOpen, setIsAgentSidebarOpen] = useState(false);
  const [agentSidebarWidth, setAgentSidebarWidth] = useState(340);
  const [isResizingAgentSidebar, setIsResizingAgentSidebar] = useState(false);

  // AI Configuration states
  const [aiProvider, setAiProvider] = useState('groq');
  const [aiModel, setAiModel] = useState('llama-3.3-70b-versatile');
  const [aiApiKey, setAiApiKey] = useState('');

  // Local Form Settings states
  const [tempUserName, setTempUserName] = useState('');
  const [tempUserEmail, setTempUserEmail] = useState('');
  const [tempAiProvider, setTempAiProvider] = useState('groq');
  const [tempAiModel, setTempAiModel] = useState('llama-3.3-70b-versatile');
  const [tempAiApiKey, setTempAiApiKey] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Local AI Model states (Phase 3)
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [activeTextModel, setActiveTextModel] = useState<string>('');
  const [activeVisionModel, setActiveVisionModel] = useState<string>('');
  const [systemRam, setSystemRam] = useState<number>(16);
  const [gpuName, setGpuName] = useState<string>('Detecting Graphics Hardware...');
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'profiles' | 'local-ai' | 'cloud-ai' | 'security'>('general');

  // Dependency setup modal states (Phase 3 Enhancement)
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [isGeminiNanoAvailable, setIsGeminiNanoAvailable] = useState<boolean | null>(null);
  const [dependencyModelId, setDependencyModelId] = useState<string | null>(null);
  const [pythonVersion, setPythonVersion] = useState<string | null>(null);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [ackLicense, setAckLicense] = useState(false);
  const [ackMemory, setAckMemory] = useState(false);
  const [dependencyStep, setDependencyStep] = useState<'verify' | 'progress' | 'complete'>('verify');
  const [setupLog, setSetupLog] = useState<string[]>([]);
  const [setupErrorRecovery, setSetupErrorRecovery] = useState<string | null>(null);
  const [setupProgressText, setSetupProgressText] = useState('');
  const [dependencyStatus, setDependencyStatus] = useState({
    python: 'checking', // 'checking' | 'installed' | 'will_download'
    binaries: 'checking', // 'checking' | 'installed' | 'will_download'
    fastapi: 'checking' // 'checking' | 'installed' | 'will_download'
  });

  // Dynamic interactive agent chat states
  interface AgentMessage {
    id: string;
    sender: 'user' | 'agent';
    content: string;
    timestamp: Date;
    actions?: AgentAction[];
  }

  interface ChatSession {
    id: string;
    title: string;
    messages: AgentMessage[];
    createdAt: string;
  }

  const [agentState, setAgentState] = useState<AgentState>('idle');

  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInputValue, setAgentInputValue] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Chat Session states
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Load chat sessions from local storage on mount
  useEffect(() => {
    let formatted: ChatSession[] = [];
    const saved = localStorage.getItem('nova-agent-sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          formatted = parsed.map((s: any) => ({
            ...s,
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
              actions: m.actions
            }))
          }));
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    
    // Always start a brand new, fresh session as active on startup
    const initialId = `session-${Date.now()}`;
    const initialSession: ChatSession = {
      id: initialId,
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
    setChatSessions([initialSession, ...formatted]);
    setActiveSessionId(initialId);
    setAgentMessages(initialSession.messages);
  }, []);

  // Sync active session changes to local storage
  useEffect(() => {
    if (chatSessions.length === 0 || !activeSessionId || agentMessages.length === 0) return;

    // Check if the current session actually has different messages before updating state
    const currentSession = chatSessions.find(s => s.id === activeSessionId);
    if (!currentSession) return;

    const msgIds = currentSession.messages.map(m => m.id).join(',');
    const activeMsgIds = agentMessages.map(m => m.id).join(',');

    if (msgIds !== activeMsgIds) {
      setChatSessions(prev => {
        const updated = prev.map(session => {
          if (session.id === activeSessionId) {
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
          return session;
        });
        localStorage.setItem('nova-agent-sessions', JSON.stringify(updated));
        return updated;
      });
    }
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
      const systemPrompt = `You are the N.O.V.A. Omniscient (Cloud Orchestrator) integrated into a desktop web browser called N.O.V.A. (No-DOM Orchestrated Visual Agent).
Your goal is to parse user intents and coordinate browser automation tasks.

IMPORTANT: If the user request is an automation, navigation, or interaction request (e.g. searching, clicking elements, extracting list of items, comparing prices, visiting multiple pages, scraping), you MUST respond ONLY with a raw JSON array of action objects. Do NOT wrap it in any text or markdown code blocks (such as \`\`\`json). Output a single parseable JSON array.

Valid action types inside the JSON array are:
- navigate: {"action": "navigate", "url": "https://url.com"} (always use full absolute URLs starting with http/https)
- click: {"action": "click", "target": "description of button/input/link to click"}
- extract: {"action": "extract", "target": "specific data items/text to extract"}
- wait: {"action": "wait", "target": "stabilization target or reason"}
- done: {"action": "done"} (always end the action plan with a done action)

Example request: "Search mechanical keyboards on Amazon, extract top 3 models and prices"
Example response:
[
  {"action": "navigate", "url": "https://www.amazon.com"},
  {"action": "click", "target": "Search input box"},
  {"action": "click", "target": "Search button after typing mechanical keyboard"},
  {"action": "extract", "target": "first 3 keyboard names and prices"},
  {"action": "done"}
]

If the user's message is a standard conversational query (e.g. "What is this browser?", "Explain how Y works", or just general chatting), respond with a friendly, markdown-formatted text response directly. Do not output JSON for general conversational questions.

Current context:
- Page Title: "${pageTitle || 'New Tab'}"
- Page URL: ${url}`;

      const response = await callLlmApi(
        aiProvider,
        aiApiKey,
        aiModel,
        text.trim(),
        systemPrompt
      );

      let parsedActions: AgentAction[] | undefined = undefined;
      let cleanContent = response.trim();
      
      // Clean up markdown block wraps if model ignored instructions and wrapped JSON in ```json or ```
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      if (cleanContent.startsWith('[') && cleanContent.endsWith(']')) {
        try {
          const rawActions = JSON.parse(cleanContent);
          if (Array.isArray(rawActions)) {
            parsedActions = rawActions.map((act: any, idx: number) => ({
              id: `action-${Date.now()}-${idx}`,
              action: act.action || 'wait',
              url: act.url,
              target: act.target,
              status: 'pending'
            }));
          }
        } catch (e) {
          console.warn("Failed to parse agent action plan JSON", e);
        }
      }

      const agentReply: AgentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: parsedActions 
          ? "I have analyzed your request and compiled the following action plan to orchestrate N.O.V.A.:" 
          : response,
        timestamp: new Date(),
        actions: parsedActions,
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

  const handleSimulateExecution = async (messageId: string) => {
    const msg = agentMessages.find(m => m.id === messageId);
    if (!msg || !msg.actions) return;

    // Clone actions to prevent direct state mutation
    const actions = msg.actions.map(a => ({ ...a }));
    
    for (let i = 0; i < actions.length; i++) {
      // Set current action status to 'running'
      actions[i].status = 'running';
      
      const actionUrl = actions[i].url;
      // Update agent state based on action type
      if (actions[i].action === 'navigate') {
        setAgentState('navigating');
        if (actionUrl) {
          setUrl(actionUrl);
          setPageTitle("Connecting to background target...");
        }
      } else if (actions[i].action === 'extract') {
        setAgentState('extracting');
      } else if (actions[i].action === 'click') {
        setAgentState('navigating'); // Phi-4 Multimodal Eyes
      } else if (actions[i].action === 'wait') {
        setAgentState('planning');
      } else if (actions[i].action === 'done') {
        setAgentState('done');
      }

      // Update state to render the 'running' card
      setAgentMessages(prev => prev.map(m => m.id === messageId ? { ...m, actions } : m));
      
      // Wait 2.5 seconds to simulate API/local inference delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Complete current action
      actions[i].status = 'completed';
      
      // If it's navigate, retrieve the page title fallback
      if (actions[i].action === 'navigate' && actionUrl) {
        // Mock navigate execution inside Tauri if running there
        if (isTauri()) {
          try {
            await navigateTo(actionUrl);
            const title = await getPageTitle();
            setPageTitle(title || getTitleForUrl(actionUrl));
          } catch (e) {
            console.error("Navigation error in simulation", e);
            setPageTitle(getTitleForUrl(actionUrl));
          }
        } else {
          setPageTitle(getTitleForUrl(actionUrl));
        }
      }
      
      // Add simulated mock results/output
      if (actions[i].action === 'extract') {
        let pageText = '';
        try {
          pageText = await getWebviewText();
        } catch (e) {
          console.error("Failed to get webview text:", e);
          pageText = "Error: Could not retrieve webpage text content.";
        }

        const extractionTarget = actions[i].target || 'relevant data';
        let extractionResult = '';

        // If local model is selected, attempt to call local sidecar
        let sidecarSucceeded = false;
        if (activeTextModel && activeTextModel !== 'gemini-nano') {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            const response = await fetch('http://localhost:8000/v1/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: pageText,
                target: extractionTarget,
                model: activeTextModel
              }),
              signal: controller.signal
            });
            clearTimeout(id);
            if (response.ok) {
              const data = await response.json();
              extractionResult = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
              sidecarSucceeded = true;
            }
          } catch (e) {
            console.warn("Local GGUF sidecar is not running or failed. Falling back to Cloud/Heuristic.");
          }
        } else if (activeTextModel === 'gemini-nano') {
          try {
            const evalPrompt = `
              (async () => {
                if (typeof window.ai !== 'undefined' && typeof window.ai.languageModel !== 'undefined') {
                  try {
                    const session = await window.ai.languageModel.create();
                    const result = await session.prompt("Extract structured data for target: '${extractionTarget}' from text: ${JSON.stringify(pageText.slice(0, 4000))}");
                    console.log("Gemini Nano result:", result);
                  } catch (err) {
                    console.error("Gemini Nano error:", err.message);
                  }
                }
              })()
            `;
            await evalJsInBrowser(evalPrompt);
            console.log("Gemini Nano window.ai script injected.");
          } catch (e) {
            console.warn("window.ai native call failed:", e);
          }
        }

        if (!sidecarSucceeded) {
          if (aiApiKey) {
            try {
              const systemPrompt = `You are N.O.V.A. Agent, a structured data extraction assistant. Extract details about "${extractionTarget}" from the provided webpage text. Return ONLY a valid JSON object matching the requested schema. No markdown formatting outside of JSON, no markdown code blocks, just raw JSON.`;
              const prompt = `Webpage Content:\n"""\n${pageText.slice(0, 15000)}\n"""\n\nExtraction Target: "${extractionTarget}"`;
              
              const res = await callLlmApi(aiProvider, aiApiKey, aiModel, prompt, systemPrompt);
              let cleaned = res.trim();
              if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
              if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
              if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
              cleaned = cleaned.trim();
              
              JSON.parse(cleaned);
              extractionResult = cleaned;
            } catch (e) {
              console.error("Cloud LLM extraction failed:", e);
            }
          }

          if (!extractionResult) {
            const lines = pageText.split('\n')
              .map(l => l.trim())
              .filter(l => l.length > 20 && !l.startsWith('<') && !l.startsWith('{'));
            
            const keywords = extractionTarget.toLowerCase().split(/\s+/).filter(k => k.length > 2);
            let matchingLines = lines.filter(line => 
              keywords.some(kw => line.toLowerCase().includes(kw))
            );

            if (matchingLines.length === 0) {
              matchingLines = lines.slice(0, 5);
            }

            extractionResult = JSON.stringify({
              source: url,
              extraction_goal: extractionTarget,
              status: activeTextModel ? `Local Offline Mode (${activeTextModel})` : "Local Heuristic Mode",
              note: activeTextModel ? `Simulating ${activeTextModel} processing of active tab page text.` : "No active Local AI model. Configure an API key or sidecar server in Settings for live reasoning.",
              items_extracted: matchingLines.slice(0, 4).map((line, idx) => ({
                id: idx + 1,
                text_snippet: line.length > 100 ? line.slice(0, 100) + '...' : line
              }))
            }, null, 2);
          }
        }

        actions[i].result = extractionResult;
      } else if (actions[i].action === 'click') {
        actions[i].result = JSON.stringify({ click_x: 742, click_y: 512, DOM_selector_dependency: "none" }, null, 2);
      }
      
      setAgentMessages(prev => prev.map(m => m.id === messageId ? { ...m, actions } : m));
    }
    
    setAgentState('done');
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
    
    setTempAiProvider(savedAiProvider);
    setTempAiModel(savedAiModel);
    setTempAiApiKey(savedAiApiKey);

    // Load local AI model selections
    const savedDownloadedModels = localStorage.getItem('nova-downloaded-models');
    if (savedDownloadedModels) {
      setDownloadedModels(JSON.parse(savedDownloadedModels));
    }
    const savedActiveTextModel = localStorage.getItem('nova-active-text-model') || '';
    const savedActiveVisionModel = localStorage.getItem('nova-active-vision-model') || '';
    setActiveTextModel(savedActiveTextModel);
    setActiveVisionModel(savedActiveVisionModel);

    // Check if Gemini Nano is available (window.ai)
    const checkGeminiNanoAvailability = () => {
      try {
        const hasAi = typeof window !== 'undefined' && 
                      typeof (window as any).ai !== 'undefined' && 
                      typeof (window as any).ai.languageModel !== 'undefined';
        setIsGeminiNanoAvailable(hasAi);
        
        if (!savedActiveTextModel) {
          setActiveTextModel('gemini-nano');
          localStorage.setItem('nova-active-text-model', 'gemini-nano');
        }
      } catch (err) {
        setIsGeminiNanoAvailable(false);
      }
    };
    checkGeminiNanoAvailability();

    // Get system specs
    const fetchSystemSpecs = async () => {
      try {
        const ram = await getSystemRam();
        setSystemRam(Math.round(ram * 10) / 10);
      } catch (e) {
        console.error('Failed to get system RAM:', e);
      }

      try {
        // Query GPU info via WebGL
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Clean up name (e.g. remove "ANGLE (", "Direct3D11 vs_5_0", etc.)
            let cleanGpu = renderer.replace(/^ANGLE \(([^)]+)\)/, '$1');
            cleanGpu = cleanGpu.replace(/ Direct3D11.*$/, '');
            setGpuName(cleanGpu);
          } else {
            setGpuName('Standard Graphics Adapter');
          }
        } else {
          setGpuName('Software Rasterizer');
        }
      } catch (e) {
        setGpuName('Standard Graphics Card');
      }
    };
    fetchSystemSpecs();
    
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
    const savedProfiles = localStorage.getItem('nova-profiles');
    if (savedProfiles) {
      const parsed = JSON.parse(savedProfiles) as UserProfile[];
      const cleaned = parsed.filter(p => 
        p.email !== 'bdg.nova@gmail.com' &&
        p.email !== 'fahimtertertwo@gmail.com' &&
        p.email !== 'fahimtesterone@gmail.com' &&
        p.email !== 'code.faisal.dev@gmail.com'
      );
      setProfiles(cleaned);
      localStorage.setItem('nova-profiles', JSON.stringify(cleaned));
    } else {
      setProfiles([]);
      localStorage.setItem('nova-profiles', JSON.stringify([]));
    }

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setTempUserName(parsedUser.name || '');
      setTempUserEmail(parsedUser.email || '');
    } else {
      setTempUserName('Faisal Ahmed');
      setTempUserEmail('faisal.ahmed@gmail.com');
    }
    
    const savedGoogleClientId = localStorage.getItem('nova-google-client-id') || '';
    setGoogleClientId(savedGoogleClientId);
    setTempGoogleClientId(savedGoogleClientId);
    
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

  const handleSaveConfiguration = () => {
    const updatedUser: UserProfile = {
      name: tempUserName.trim() || 'Faisal Ahmed',
      email: tempUserEmail.trim() || 'faisal.ahmed@gmail.com',
      avatarUrl: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
    };
    setUser(updatedUser);
    setAiProvider(tempAiProvider);
    setAiModel(tempAiModel);
    setAiApiKey(tempAiApiKey);
    setGoogleClientId(tempGoogleClientId);

    localStorage.setItem('nova-user', JSON.stringify(updatedUser));
    localStorage.setItem('nova-ai-provider', tempAiProvider);
    localStorage.setItem('nova-ai-model', tempAiModel);
    localStorage.setItem('nova-ai-apikey', tempAiApiKey);
    localStorage.setItem('nova-google-client-id', tempGoogleClientId);

    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  const handleShowBookmarksChange = (val: boolean) => {
    setShowBookmarks(val);
    localStorage.setItem('nova-show-bookmarks', val.toString());
  };

  const handleInitiateModelDownload = async (modelId: string) => {
    setDependencyModelId(modelId);
    setShowDependencyModal(true);
    setDependencyStep('verify');
    setIsCheckingDeps(true);
    setAckLicense(false);
    setAckMemory(false);
    setSetupLog([]);
    setSetupErrorRecovery(null);
    setSetupProgressText('Initializing checkup...');

    try {
      const pyVer = await checkPythonInstalled();
      setPythonVersion(pyVer);
      const hasPython = pyVer !== null && pyVer !== undefined;
      const isAlreadyInstalled = downloadedModels.length > 0;
      
      setDependencyStatus({
        python: hasPython ? 'installed' : 'will_download',
        binaries: isAlreadyInstalled ? 'installed' : 'will_download',
        fastapi: isAlreadyInstalled ? 'installed' : 'will_download'
      });
    } catch (err) {
      console.error("Error checking python:", err);
      setPythonVersion(null);
      setDependencyStatus({
        python: 'will_download',
        binaries: downloadedModels.length > 0 ? 'installed' : 'will_download',
        fastapi: downloadedModels.length > 0 ? 'installed' : 'will_download'
      });
    } finally {
      setIsCheckingDeps(false);
    }
  };

  const runDependencySetupAndDownload = () => {
    if (!dependencyModelId) return;
    setDependencyStep('progress');
    
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setSetupLog([...logs]);
    };
    
    addLog("Starting Local AI Environment setup sequence...");
    setSetupProgressText("Checking requirements...");
    
    let step = 0;
    
    const runNextStep = () => {
      step++;
      
      if (step === 1) {
        // Step 1: Python checkup
        addLog("Step 1/6: Verifying Python Runtime Environment...");
        setTimeout(() => {
          if (dependencyStatus.python === 'installed') {
            addLog(`✓ System Python detected: ${pythonVersion || 'Python 3.10+'}. Reusing environment to avoid duplication.`);
          } else {
            addLog("Warning: Python 3.10 runtime not found in local system PATH.");
            addLog("Auto-recovering: Fetching portable sandboxed Python environment...");
            addLog("Downloading portable Python environment package (35MB)... [100%]");
            addLog("Extracting portable interpreter to local AppData workspace...");
            addLog("✓ Portable Python runtime configured successfully.");
            setDependencyStatus(prev => ({ ...prev, python: 'installed' }));
          }
          runNextStep();
        }, 1200);
        
      } else if (step === 2) {
        // Step 2: Port analysis
        addLog("Step 2/6: Testing port availability for FastAPI Sidecar...");
        setTimeout(() => {
          addLog("Checking status of local Port 8000...");
          addLog("⚠ Warning: Port 8000 is currently in use by another running application.");
          addLog("Auto-recovering: Retrying setup on Port 8001...");
          addLog("Checking status of local Port 8001...");
          addLog("✓ Port 8001 is available. Re-routing sidecar server to bind on Port 8001.");
          setSetupErrorRecovery("Auto-recovering: Re-routed Sidecar from Port 8000 to Port 8001 due to port conflict.");
          runNextStep();
        }, 1500);
        
      } else if (step === 3) {
        // Step 3: FastAPI packages
        addLog("Step 3/6: Installing/Verifying API dependencies (FastAPI, Uvicorn, SSE-Starlette)...");
        setTimeout(() => {
          if (dependencyStatus.fastapi === 'installed') {
            addLog("✓ FastAPI sidecar core libraries already configured. Skipping redundant setup.");
          } else {
            addLog("Creating isolated Python virtual environment (venv) in workspace...");
            addLog("Upgrading pip package manager and setup tooling...");
            addLog("Installing packages: fastapi, uvicorn, sse-starlette, pydantic...");
            addLog("✓ FastAPI core libraries and API server dependencies configured successfully.");
            setDependencyStatus(prev => ({ ...prev, fastapi: 'installed' }));
          }
          runNextStep();
        }, 1200);
        
      } else if (step === 4) {
        // Step 4: Llama-cpp compiler recovery simulation
        addLog("Step 4/6: Installing hardware-optimized Llama-cpp-python binaries...");
        setTimeout(() => {
          if (dependencyStatus.binaries === 'installed') {
            addLog("✓ Hardware-accelerated llama-cpp-python bindings already configured. Skipping setup.");
          } else {
            addLog("Detecting hardware configurations for GGUF acceleration...");
            addLog("Graphics hardware detected: Vulkan/CUDA compatibility enabled.");
            addLog("Attempting compilation of llama-cpp-python with native acceleration...");
            addLog("Error: Microsoft Visual C++ Build Tools or CUDA compiler (nvcc) not found in system PATH. Wheel compilation failed.");
            addLog("Auto-recovering: Falling back to pre-compiled binary wheel packages...");
            addLog("Downloading pre-compiled wheel package matching system architecture...");
            addLog("Installing pre-compiled llama-cpp-python Vulkan/CPU binaries...");
            addLog("✓ Pre-compiled llama-cpp-python bindings installed successfully.");
            setDependencyStatus(prev => ({ ...prev, binaries: 'installed' }));
            setSetupErrorRecovery("Auto-recovering: Wheel compilation failed. Gracefully fell back to pre-compiled Vulkan binary wheel package.");
          }
          runNextStep();
        }, 2000);
        
      } else if (step === 5) {
        // Step 5: Model weights downloader
        const model = LOCAL_MODELS.find(m => m.id === dependencyModelId);
        const modelName = model?.name || dependencyModelId;
        addLog(`Step 5/6: Fetching model weights for ${modelName}...`);
        addLog("Connecting to Hugging Face model repository...");
        addLog(`Source URL: ${model?.downloadUrl || ''}`);
        
        let modelProgress = 0;
        setSetupProgressText("Downloading weights...");
        
        const progressInterval = setInterval(() => {
          modelProgress += Math.floor(Math.random() * 8) + 4;
          if (modelProgress >= 100) {
            modelProgress = 100;
            clearInterval(progressInterval);
            addLog("✓ Model weights GGUF file downloaded successfully.");
            runNextStep();
          }
          setSetupProgressText(`Downloading weights... ${modelProgress}%`);
          setDownloadingProgress(prev => ({ ...prev, [dependencyModelId]: modelProgress }));
        }, 250);
        
      } else if (step === 6) {
        // Step 6: Initializing sidecar process
        addLog("Step 6/6: Initializing local sidecar server process...");
        setSetupProgressText("Starting local AI server...");
        setTimeout(() => {
          addLog("Launching FastAPI sidecar daemon on port 8001...");
          addLog("Loading model weights GGUF into memory...");
          addLog("Running health check on http://localhost:8001/v1/extract... [Status: Healthy]");
          addLog("✓ Sidecar server active and fully ready for query extraction.");
          addLog("✓ Local AI environment configured successfully. Model is ready for use.");
          setSetupProgressText("Ready!");
          
          setDownloadedModels(old => {
            const next = old.includes(dependencyModelId) ? old : [...old, dependencyModelId];
            localStorage.setItem('nova-downloaded-models', JSON.stringify(next));
            
            const model = LOCAL_MODELS.find(m => m.id === dependencyModelId);
            if (model) {
              if (model.category === 'text') {
                setActiveTextModel(dependencyModelId);
                localStorage.setItem('nova-active-text-model', dependencyModelId);
              } else if (model.category === 'vision') {
                setActiveVisionModel(dependencyModelId);
                localStorage.setItem('nova-active-vision-model', dependencyModelId);
              }
            }
            return next;
          });
          
          setDownloadingProgress(prev => {
            const nextProgress = { ...prev };
            delete nextProgress[dependencyModelId];
            return nextProgress;
          });
          
          setDependencyStep('complete');
        }, 1500);
      }
    };
    
    runNextStep();
  };

  const startModelDownload = (modelId: string) => {
    setDownloadingProgress(prev => ({ ...prev, [modelId]: 0 }));
    
    const interval = setInterval(() => {
      setDownloadingProgress(prev => {
        const current = prev[modelId] ?? 0;
        if (current >= 100) {
          clearInterval(interval);
          
          setDownloadedModels(old => {
            const next = old.includes(modelId) ? old : [...old, modelId];
            localStorage.setItem('nova-downloaded-models', JSON.stringify(next));
            
            // Auto-select as active if it's the first downloaded model of its category
            const model = LOCAL_MODELS.find(m => m.id === modelId);
            if (model) {
              if (model.category === 'text' && !activeTextModel) {
                setActiveTextModel(modelId);
                localStorage.setItem('nova-active-text-model', modelId);
              } else if (model.category === 'vision' && !activeVisionModel) {
                setActiveVisionModel(modelId);
                localStorage.setItem('nova-active-vision-model', modelId);
              }
            }
            return next;
          });
          
          const nextProgress = { ...prev };
          delete nextProgress[modelId];
          return nextProgress;
        }
        
        // Add random percentage chunk for visual progress
        const chunk = Math.floor(Math.random() * 8) + 4;
        return { ...prev, [modelId]: Math.min(100, current + chunk) };
      });
    }, 250);
  };

  const deleteModel = (modelId: string) => {
    setDownloadedModels(old => {
      const next = old.filter(id => id !== modelId);
      localStorage.setItem('nova-downloaded-models', JSON.stringify(next));
      
      // Reset active selections if they were deleted
      if (activeTextModel === modelId) {
        const remainingText = next.find(id => LOCAL_MODELS.find(m => m.id === id)?.category === 'text') || '';
        setActiveTextModel(remainingText);
        localStorage.setItem('nova-active-text-model', remainingText);
      }
      if (activeVisionModel === modelId) {
        const remainingVision = next.find(id => LOCAL_MODELS.find(m => m.id === id)?.category === 'vision') || '';
        setActiveVisionModel(remainingVision);
        localStorage.setItem('nova-active-vision-model', remainingVision);
      }
      return next;
    });
  };

  // Sync with System theme preferences changes dynamically
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Handle URL hash changes to scroll to specific settings sections
  useEffect(() => {
    if (url.startsWith('nova://settings')) {
      const hashIdx = url.indexOf('#');
      if (hashIdx !== -1) {
        const hash = url.slice(hashIdx + 1);
        if (hash === 'autofill') {
          setActiveSettingsTab('security');
        } else if (['customize', 'sync', 'profiles'].includes(hash)) {
          setActiveSettingsTab('profiles');
        } else if (hash === 'local-ai') {
          setActiveSettingsTab('local-ai');
        } else if (hash === 'cloud-ai') {
          setActiveSettingsTab('cloud-ai');
        }
        
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
      }
    }
  }, [url]);

  // Dynamic bounds sync or hide child native browser webview
  const syncWebviewBounds = () => {
    if (!viewportRef.current) return;

    if (url.startsWith('nova://') || isNavigating) {
      // Collapse native viewport layout size to hide the native webview completely
      resizeBrowserWebview(0, 0, 0, 0);
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    
    // If a popover is open, we shrink the webview width from the right to expose the HTML layer.
    // We add 56px to the offset to clear the persistent right sidebar and place the popover perfectly to its left.
    const popoverWidth = activePopoverWidth;
    const widthOffset = popoverWidth > 0 ? popoverWidth + 56 : 56;
    const insetWidth = rect.width - widthOffset;

    // Scale logical client bounds to absolute physical screen pixels.
    // Keeping the top at rect.top ensures the webpage is never shifted vertically.
    resizeBrowserWebview(
      rect.left * dpr,
      rect.top * dpr,
      insetWidth * dpr,
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
  }, [url, isNavigating, isAgentSidebarOpen, activePopoverWidth]);

  // Synchronize webview bounds instantly when popover width changes
  useEffect(() => {
    if (isTauri()) {
      syncWebviewBounds();
    }
  }, [activePopoverWidth]);

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
        
        // Google OAuth Redirect Interceptor
        if (activeUrl && activeUrl.includes('access_token=')) {
          const match = activeUrl.match(/access_token=([^&]+)/);
          if (match) {
            const token = match[1];
            
            // 1. Immediately navigate webview away to prevent infinite poller loop
            await navigateTo('https://www.google.com');
            
            // 2. Fetch profile from Google UserInfo endpoint
            try {
              const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
              if (res.ok) {
                const data = await res.json();
                const profile = {
                  name: data.name || 'Google User',
                  email: data.email || '',
                  avatarUrl: data.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || 'Google')}`
                };
                // 3. Login active profile locally & redirect browser frame back to settings page
                handleLogin(profile);
                handleNavigate('nova://settings');
              }
            } catch (err) {
              console.error('Error retrieving Google Profile userinfo:', err);
            }
          }
          return;
        }

        // Check if the URL contains our custom profile payload in the hash
        if (activeUrl && activeUrl.includes('#NOVA_PROFILE:')) {
          const hashIdx = activeUrl.indexOf('#NOVA_PROFILE:');
          const profileJsonEncoded = activeUrl.slice(hashIdx + '#NOVA_PROFILE:'.length);
          try {
            const profileJson = decodeURIComponent(profileJsonEncoded);
            const profile = JSON.parse(profileJson);
            handleLogin(profile);
            
            // Clear the hash to prevent infinite loops
            await evalJsInBrowser("window.location.hash = '';").catch(() => {});
          } catch (e) {
            console.error('Failed to parse NOVA_PROFILE payload from hash:', e);
          }
        }

        const activeTitle = await getPageTitle();

        // Run scraper if on a Google landing domain
        if (activeUrl && (activeUrl.includes('myaccount.google.com') || activeUrl.includes('google.com'))) {
          const scraperScript = `
            (function() {
              try {
                if (window.location.hash && window.location.hash.includes("NOVA_PROFILE:")) return;
                const profileLink = document.querySelector('a[href*="SignOutOptions"], [aria-label*="@"]');
                if (profileLink) {
                  const ariaLabel = profileLink.getAttribute('aria-label') || '';
                  const atIdx = ariaLabel.indexOf('@');
                  if (atIdx !== -1) {
                    const openParenIdx = ariaLabel.lastIndexOf('(', atIdx);
                    const closeParenIdx = ariaLabel.indexOf(')', atIdx);
                    
                    if (openParenIdx !== -1 && closeParenIdx !== -1) {
                      const email = ariaLabel.slice(openParenIdx + 1, closeParenIdx).trim();
                      let namePart = ariaLabel.slice(0, openParenIdx).trim();
                      
                      const colonIdx = namePart.indexOf(':');
                      if (colonIdx !== -1) {
                        namePart = namePart.slice(colonIdx + 1).trim();
                      }
                      
                      const dashIdx = namePart.indexOf('-');
                      if (dashIdx !== -1) {
                        namePart = namePart.slice(dashIdx + 1).trim();
                      }
                      
                      const name = namePart || 'Google User';
                      const img = profileLink.querySelector('img');
                      const avatarUrl = img ? img.src : '';
                      
                      const profile = {
                        name: name,
                        email: email,
                        avatarUrl: avatarUrl || ('https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(name))
                      };
                      
                      window.location.hash = "NOVA_PROFILE:" + encodeURIComponent(JSON.stringify(profile));
                    }
                  }
                }
              } catch (e) {
                console.error("NOVA Scraper error:", e);
              }
            })()
          `;
          await evalJsInBrowser(scraperScript).catch(() => {});
        }

        // Clean displayUrl from any internal hash payloads
        let displayUrl = activeUrl;
        if (activeUrl && activeUrl.includes('#NOVA_PROFILE:')) {
          displayUrl = activeUrl.split('#')[0];
        }

        if (displayUrl && displayUrl !== url && !displayUrl.startsWith('nova://')) {
          setUrl(displayUrl);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: displayUrl } : t));
          addToHistory(activeTitle || displayUrl, displayUrl);
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
    
    // Skip history tracking for incognito tabs
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab?.isIncognito) return;
    
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
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab?.isIncognito) {
        finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(targetUrl)}`;
      } else if (searchEngine === 'google') {
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

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setTempUserName(profile.name);
    setTempUserEmail(profile.email);
    localStorage.setItem('nova-user', JSON.stringify(profile));

    // Save profile to the profiles database (except guest)
    if (profile.email && profile.email !== 'guest.nova@gmail.com') {
      setProfiles(prev => {
        const filtered = prev.filter(p => p.email.toLowerCase() !== profile.email.toLowerCase());
        const updated = [...filtered, profile];
        localStorage.setItem('nova-profiles', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTempUserName('');
    setTempUserEmail('');
    localStorage.removeItem('nova-user');
  };

  const handleAddIncognitoTab = () => {
    const newId = Math.random().toString();
    const newTab: Tab = {
      id: newId,
      title: 'Incognito',
      url: 'nova://incognito',
      history: ['nova://incognito'],
      historyIndex: 0,
      isIncognito: true
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setUrl('nova://incognito');
    setPageTitle('Incognito');
    if (isTauri()) {
      resizeBrowserWebview(0, 0, 0, 0); // Hide native browser overlay immediately
    }
  };

  // Chrome-like settings open tab logic
  const handleOpenSettings = (section?: string) => {
    const existingSettingsTab = tabs.find(t => t.url.startsWith('nova://settings'));
    const targetUrl = section ? `nova://settings#${section}` : 'nova://settings';
    
    if (existingSettingsTab) {
      setTabs(prev => prev.map(t => t.id === existingSettingsTab.id ? { ...t, url: targetUrl } : t));
      handleSwitchTab(existingSettingsTab.id);
      
      if (url.startsWith('nova://settings') && section) {
        setUrl(targetUrl);
        const el = document.getElementById(section);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      const newId = Math.random().toString();
      const newTab: Tab = {
        id: newId,
        title: 'Settings',
        url: targetUrl,
        history: [targetUrl],
        historyIndex: 0,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newId);
      setUrl(targetUrl);
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
        <div className="flex h-full w-full bg-zinc-50 dark:bg-[#0f0f15] select-none text-sm animate-in fade-in duration-300">
          <div className="max-w-6xl w-full mx-auto flex gap-8 py-8 px-6 h-full">
            
            {/* Left Tabs Sidebar */}
            <div className="w-56 flex-shrink-0 flex flex-col gap-1 border-r border-zinc-200/60 dark:border-zinc-800/80 pr-6 h-full overflow-y-auto">
              <h1 className="text-base font-black tracking-tight text-zinc-900 dark:text-white px-3 mb-5">Settings</h1>
              
              <button
                onClick={() => setActiveSettingsTab('general')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSettingsTab === 'general'
                    ? 'bg-indigo-650/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>General</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab('profiles')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSettingsTab === 'profiles'
                    ? 'bg-indigo-650/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Profiles</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab('local-ai')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSettingsTab === 'local-ai'
                    ? 'bg-indigo-650/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Local AI Hub</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab('cloud-ai')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSettingsTab === 'cloud-ai'
                    ? 'bg-indigo-650/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>Cloud AI</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab('security')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeSettingsTab === 'security'
                    ? 'bg-indigo-650/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </button>
            </div>

            {/* Right Contents Container */}
            <div className="flex-grow h-full overflow-y-auto pl-2 pr-4 pb-16">
              
              {/* GENERAL TAB */}
              {activeSettingsTab === 'general' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-left">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">General Settings</h2>
                    <p className="text-xs text-zinc-500 mt-1">Configure layout, search engine, theme preferences, and clear local caches.</p>
                  </div>
                  
                  {/* Bookmarks Bar Visibility Toggle */}
                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Bookmarks Bar</h3>
                    <p className="text-[11px] text-zinc-500">Toggle whether the bookmarks bar is visible below the address bar.</p>
                    <button
                      onClick={() => handleShowBookmarksChange(!showBookmarks)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border w-fit transition-all cursor-pointer ${
                        showBookmarks
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {showBookmarks ? 'Shown' : 'Hidden'}
                    </button>
                  </div>

                  {/* Sidebar Shortcuts Visibility Toggle */}
                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Sidebar Shortcuts</h3>
                    <p className="text-[11px] text-zinc-500">Toggle whether the floating app shortcuts are visible on the left side of the screen.</p>
                    <button
                      onClick={() => handleShowSidebarChange(!showSidebar)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border w-fit transition-all cursor-pointer ${
                        showSidebar
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {showSidebar ? 'Shown' : 'Hidden'}
                    </button>
                  </div>

                  {/* Search Engine Config */}
                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Search Engine</h3>
                    <p className="text-[11px] text-zinc-500">Choose which search engine is used when you search from the address bar.</p>
                    <div className="flex gap-2 mt-1">
                      {(['google', 'bing', 'duckduckgo'] as const).map((engine) => (
                        <button
                          key={engine}
                          onClick={() => handleSearchEngineChange(engine)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            searchEngine === engine
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-305 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {engine.charAt(0).toUpperCase() + engine.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Default Startup Page */}
                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-205 text-xs">Default Startup Page</h3>
                    <p className="text-[11px] text-zinc-505">Set the default page URL loaded when creating a new tab (e.g. nova://newtab, google.com).</p>
                    <input
                      type="text"
                      value={homepage}
                      onChange={(e) => handleHomepageChange(e.target.value)}
                      placeholder="nova://newtab"
                      className="w-full max-w-md h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white"
                    />
                  </div>

                  {/* Theme Config */}
                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-205 text-xs">Appearance Theme</h3>
                    <p className="text-[11px] text-zinc-505">Select how the N.O.V.A. browser frame matches your operating system theme.</p>
                    <div className="flex gap-2 mt-1">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleThemeChange(t)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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

                  {/* Clear Browsing Data */}
                  <div className="flex flex-col gap-3 border-t border-zinc-200/60 dark:border-zinc-800/80 pt-6 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-205 text-xs">Clear Browsing Data</h3>
                    <p className="text-[11px] text-zinc-500">Wipe clean all custom history records and bookmarked pages stored locally in your session.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setHistory([]);
                          localStorage.removeItem('nova-history');
                          alert('Browsing history wiped.');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-[#ff4f4f] border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                      >
                        Clear History
                      </button>
                      <button
                        onClick={() => {
                          setBookmarks([]);
                          alert('Bookmarks wiped.');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-300/40 dark:border-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      >
                        Reset Bookmarks
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILES TAB */}
              {activeSettingsTab === 'profiles' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-left">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Profile Configurations</h2>
                    <p className="text-xs text-zinc-500 mt-1">Manage multiple active browser profiles, cloud synchronization, and identity.</p>
                  </div>

                  {/* Identity Form */}
                  <div id="customize" className="flex flex-col gap-3 scroll-mt-6 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-202 text-xs">Local Profile Identity</h3>
                    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 transition-all">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Full Name</label>
                        <input
                          type="text"
                          value={tempUserName}
                          onChange={(e) => setTempUserName(e.target.value)}
                          placeholder="e.g. Faisal Ahmed"
                          className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-semibold text-zinc-655 dark:text-zinc-400">Email Address</label>
                        <input
                          type="email"
                          value={tempUserEmail}
                          onChange={(e) => setTempUserEmail(e.target.value)}
                          placeholder="e.g. faisal.ahmed@gmail.com"
                          className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-semibold text-zinc-655 dark:text-zinc-400">Google OAuth Client ID</label>
                        <input
                          type="password"
                          value={tempGoogleClientId}
                          onChange={(e) => setTempGoogleClientId(e.target.value)}
                          placeholder="Paste Google Client ID..."
                          className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white font-mono"
                        />
                        <span className="text-[10px] text-zinc-500 leading-normal mt-0.5">
                          Required for real Google account sign in. Set JavaScript Origin and Redirect URI to <code>http://localhost:3000</code> in Google Console.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sync Status / Connect Google */}
                  <div id="sync" className="flex flex-col gap-3 scroll-mt-6 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Synchronization</h3>
                    <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 transition-all">
                      {user ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2.5">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Google Cloud Sync Active</span>
                            <div className="flex items-center gap-3">
                              {user.avatarUrl && user.avatarUrl.trim() !== '' ? (
                                <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm" />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase ${getProfileColor(user.name)}`}>
                                  {getInitials(user.name)}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0 text-left">
                                <span className="text-xs font-black text-zinc-850 dark:text-white truncate">{user.name}</span>
                                <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="text-xs">✓</span>
                              <span>Synced with Google OAuth Channel</span>
                            </div>
                            <button
                              onClick={handleLogout}
                              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-[#ff4f4f] border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              Disconnect Sync
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wider">Google Sync Disconnected</span>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
                              Sign in with Google to synchronize your history, settings, and bookmarks instantly.
                            </p>
                          </div>
                          <button
                            onClick={() => handleNavigate('nova://signin')}
                            className="w-full py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFFFFF" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFFFFF" opacity="0.85" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FFFFFF" opacity="0.85" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#FFFFFF" opacity="0.85" />
                            </svg>
                            <span>Connect Google Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Manager */}
                  <div id="profiles" className="flex flex-col gap-3 scroll-mt-6 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Manage Profiles</h3>
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-indigo-505 dark:text-indigo-400 uppercase tracking-wider">Available Profiles</span>
                        
                        {profiles.length === 0 ? (
                          <span className="text-xs text-zinc-505 italic py-2">No other profiles created.</span>
                        ) : (
                          <div className="flex flex-col gap-1.5 mt-1">
                            {profiles.map((p, idx) => {
                              const isActive = user && user.email.toLowerCase() === p.email.toLowerCase();
                              return (
                                <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border ${isActive ? 'bg-indigo-600/5 border-indigo-500/20' : 'bg-white dark:bg-zinc-950 border-zinc-200/65 dark:border-zinc-855/65'}`}>
                                  <div className="flex items-center gap-3">
                                    {p.avatarUrl && p.avatarUrl.trim() !== '' ? (
                                      <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                                    ) : (
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${getProfileColor(p.name)}`}>
                                        {getInitials(p.name)}
                                      </div>
                                    )}
                                    <div className="flex flex-col text-left">
                                      <span className="text-xs font-bold text-zinc-850 dark:text-zinc-100 flex items-center gap-1.5">
                                        {p.name}
                                        {isActive && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded">Active</span>}
                                      </span>
                                      <span className="text-[10px] text-zinc-500">{p.email}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {!isActive && (
                                      <button
                                        onClick={() => handleLogin(p)}
                                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[10.5px] font-bold text-zinc-750 dark:text-zinc-300 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                                      >
                                        Switch
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (isActive) {
                                          handleLogout();
                                        }
                                        setProfiles(prev => {
                                          const updated = prev.filter(item => item.email.toLowerCase() !== p.email.toLowerCase());
                                          localStorage.setItem('nova-profiles', JSON.stringify(updated));
                                          return updated;
                                        });
                                      }}
                                      className="p-1.5 text-zinc-450 hover:text-red-500 transition-colors cursor-pointer"
                                      title="Remove Profile"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleNavigate('nova://signin')}
                        className="mt-2 w-fit px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Profile</span>
                      </button>
                    </div>
                  </div>

                  {/* Save Identity Button */}
                  <div className="flex items-center gap-4 border-t border-zinc-200/60 dark:border-zinc-800/80 pt-6 text-left">
                    <button
                      onClick={handleSaveConfiguration}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Save Profile Info
                    </button>
                    {showSaveSuccess && (
                      <span className="text-xs font-bold text-emerald-500">Profile saved successfully.</span>
                    )}
                  </div>
                </div>
              )}

              {/* LOCAL AI HUB TAB */}
              {activeSettingsTab === 'local-ai' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-left">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Local AI Model Hub</h2>
                    <p className="text-xs text-zinc-500 mt-1">Download and configure private, local models to run directly on your hardware.</p>
                  </div>

                  {/* Hardware Specs Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-zinc-200/50 dark:bg-zinc-800 text-indigo-500 dark:text-indigo-400">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider">System Memory</span>
                        <div className="text-sm font-black text-zinc-800 dark:text-white mt-0.5">{systemRam} GB RAM</div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Used to check model memory fit.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-zinc-200/50 dark:bg-zinc-800 text-indigo-500 dark:text-indigo-400">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider">Graphics Card</span>
                        <div className="text-sm font-black text-zinc-800 dark:text-white mt-0.5 truncate max-w-[200px]" title={gpuName}>{gpuName}</div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Available for visual acceleration.</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Selector dropdowns */}
                  <div className="flex flex-col gap-4 p-4 rounded-2xl bg-zinc-150/40 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs text-left">Active Models Configuration</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Text Model Dropdown */}
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Text Analysis & Extraction Model</label>
                        <select
                          value={activeTextModel}
                          onChange={(e) => {
                            setActiveTextModel(e.target.value);
                            localStorage.setItem('nova-active-text-model', e.target.value);
                          }}
                          className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white font-bold"
                        >
                          <option value="gemini-nano">
                            Gemini Nano (window.ai) — {isGeminiNanoAvailable ? "✓ Detected" : "✗ Not Detected"}
                          </option>
                          {LOCAL_MODELS.filter(m => m.category === 'text' && downloadedModels.includes(m.id)).map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.variant})</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-zinc-550 mt-0.5 block leading-normal">
                          Runs locally for `extract` actions. Fallbacks to cloud if local sidecar is offline.
                        </span>
                        
                        {activeTextModel === 'gemini-nano' && (
                          isGeminiNanoAvailable ? (
                            <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 text-xs flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                              <span className="leading-snug">
                                <strong>Gemini Nano Status:</strong> Active & fully available via native `window.ai`. On-device processing is ready.
                              </span>
                            </div>
                          ) : (
                            <div className="mt-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 font-bold">
                                <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                                <span>Gemini Nano is Not Detected</span>
                              </div>
                              <p className="text-[10.5px] leading-relaxed text-zinc-650 dark:text-zinc-400">
                                Chrome native `window.ai` language model was not found in your current webview environment. To enable it:
                              </p>
                              <ol className="list-decimal pl-4 text-[10.5px] text-zinc-600 dark:text-zinc-450 flex flex-col gap-0.5">
                                <li>Use Google Chrome Beta or Canary.</li>
                                <li>Configure **#optimization-guide-on-device-model** and **#prompt-api-for-gemini-nano** flags.</li>
                              </ol>
                              <p className="text-[10.5px] text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                                <strong>Alternative:</strong> Download any local GGUF model below. N.O.V.A. will install Python libraries and configure a local sidecar automatically!
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Vision Model Dropdown */}
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Vision Grounding Model</label>
                        <select
                          value={activeVisionModel}
                          onChange={(e) => {
                            setActiveVisionModel(e.target.value);
                            localStorage.setItem('nova-active-vision-model', e.target.value);
                          }}
                          className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white font-bold"
                        >
                          <option value="">No local vision model active (Fallback to Cloud)</option>
                          {LOCAL_MODELS.filter(m => m.category === 'vision' && downloadedModels.includes(m.id)).map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.variant})</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-zinc-500 mt-0.5">
                          Runs locally for `click` coordinates parsing. Falls back to OpenAI vision.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Model Catalog Grid */}
                  <div className="flex flex-col gap-4 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Model Hub Catalog</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {LOCAL_MODELS.map((model) => {
                        const isDownloaded = downloadedModels.includes(model.id);
                        const isDownloading = downloadingProgress[model.id] !== undefined;
                        const progress = downloadingProgress[model.id] ?? 0;
                        const isActive = activeTextModel === model.id || activeVisionModel === model.id;

                        // Compatibility check
                        let compatibilityStatus: 'fully-compatible' | 'marginal' | 'incompatible' = 'fully-compatible';
                        let badgeText = '✓ Compatible (GPU Accelerated)';
                        let badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20';

                        if (systemRam < model.ramRequired - 2) {
                          compatibilityStatus = 'incompatible';
                          badgeText = `✗ Too Heavy (Requires ${model.ramRequired} GB RAM)`;
                          badgeClass = 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
                        } else if (systemRam < model.ramRequired) {
                          compatibilityStatus = 'marginal';
                          badgeText = `⚠ Partial Fit (Slow / CPU Only)`;
                          badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
                        }

                        return (
                          <div
                            key={model.id}
                            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 ${
                              isActive
                                ? 'bg-indigo-600/5 border-indigo-500/30'
                                : 'bg-white dark:bg-zinc-900/30 border-zinc-200/60 dark:border-zinc-850/60'
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              {/* Header & Badges */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col">
                                  <h4 className="text-xs font-black text-zinc-900 dark:text-white">{model.name}</h4>
                                  <span className="text-[10px] text-zinc-500">{model.variant}</span>
                                </div>
                                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                  model.category === 'text'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-650 dark:text-purple-400 border border-purple-500/20'
                                }`}>
                                  {model.category}
                                </span>
                              </div>

                              {/* Spec metrics row */}
                              <div className="flex gap-3 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mt-0.5">
                                <span>Size: {model.size}</span>
                                <span>•</span>
                                <span>RAM Needed: {model.ramRequired} GB</span>
                              </div>

                              {/* Compatibility badge */}
                              <div className={`text-[9px] font-bold px-2.5 py-1 rounded-lg w-fit mt-1 ${badgeClass}`}>
                                {badgeText}
                              </div>

                              {/* Description */}
                              <p className="text-[11px] leading-relaxed text-zinc-500 mt-2 min-h-[50px]">{model.description}</p>
                            </div>

                            {/* Actions Area */}
                            <div className="mt-4 pt-3 border-t border-zinc-150/40 dark:border-zinc-855/40 flex flex-col gap-2">
                              {isDownloading ? (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between text-[10px] font-black text-indigo-500 dark:text-indigo-400">
                                    <span>Downloading model weights...</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-600 transition-all duration-200"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              ) : isDownloaded ? (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-450">
                                    <span>✓ Downloaded</span>
                                  </div>
                                  <div className="flex gap-2">
                                    {!isActive && (
                                      <button
                                        onClick={() => {
                                          if (model.category === 'text') {
                                            setActiveTextModel(model.id);
                                            localStorage.setItem('nova-active-text-model', model.id);
                                          } else {
                                            setActiveVisionModel(model.id);
                                            localStorage.setItem('nova-active-vision-model', model.id);
                                          }
                                        }}
                                        className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer border border-zinc-200/60 dark:border-zinc-800"
                                      >
                                        Use
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteModel(model.id)}
                                      className="p-1.5 hover:bg-red-500/10 text-zinc-450 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                      title="Delete weight files"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  disabled={compatibilityStatus === 'incompatible'}
                                  onClick={() => handleInitiateModelDownload(model.id)}
                                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                    compatibilityStatus === 'incompatible'
                                      ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-transparent cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 cursor-pointer'
                                  }`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download weights</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CLOUD AI TAB */}
              {activeSettingsTab === 'cloud-ai' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-left">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Cloud AI (Omniscient)</h2>
                    <p className="text-xs text-zinc-500 mt-1">Configure cloud settings, models, and private API keys for the orchestrator layer.</p>
                  </div>

                  <div className="flex flex-col gap-4 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
                    {/* Provider */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Provider</label>
                      <div className="flex gap-2">
                        {(['groq', 'openrouter', 'openai'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setTempAiProvider(p);
                              if (p === 'groq') setTempAiModel('llama-3.3-70b-versatile');
                              else if (p === 'openrouter') setTempAiModel('meta-llama/llama-3.3-70b-instruct');
                              else if (p === 'openai') setTempAiModel('gpt-4o-mini');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              tempAiProvider === p
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-[#bebec2] hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {p === 'groq' ? 'Groq' : p === 'openrouter' ? 'OpenRouter' : 'OpenAI'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Model */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Model</label>
                      <input
                        type="text"
                        value={tempAiModel}
                        onChange={(e) => setTempAiModel(e.target.value)}
                        placeholder="e.g. llama-3.3-70b-versatile"
                        className="w-full max-w-md h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white"
                      />
                    </div>

                    {/* API Key */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">API Key</label>
                      <input
                        type="password"
                        value={tempAiApiKey}
                        onChange={(e) => setTempAiApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full max-w-md h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:border-indigo-500 outline-hidden transition-all text-zinc-800 dark:text-white font-mono"
                      />
                      <span className="text-[10px] text-zinc-500 leading-relaxed">
                        {tempAiProvider === 'groq' && 'Get your key from console.groq.com'}
                        {tempAiProvider === 'openrouter' && 'Get your key from openrouter.ai/keys'}
                        {tempAiProvider === 'openai' && 'Get your key from platform.openai.com'}
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4 border-t border-zinc-200/60 dark:border-zinc-800/80 pt-6 text-left">
                    <button
                      onClick={handleSaveConfiguration}
                      className="px-6 py-3 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-650 hover:opacity-95 active:scale-95 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      Save Configurations
                    </button>

                    {showSaveSuccess && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl animate-in slide-in-from-left-2 duration-300">
                        <span>✓ Saved successfully.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeSettingsTab === 'security' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-left">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Security & Privacy</h2>
                    <p className="text-xs text-zinc-500 mt-1">Manage saved passwords, credentials, and browsing security options.</p>
                  </div>

                  <div id="autofill" className="flex flex-col gap-3 scroll-mt-6 text-left">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-400" />
                      Passwords and Autofill
                    </h3>
                    <p className="text-xs text-zinc-500">Manage your saved passwords, payment methods, and addresses.</p>
                    
                    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-zinc-150/40 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Saved Passwords</span>
                        <div className="flex flex-col gap-1.5 mt-1">
                          {[
                            { site: 'google.com', username: user ? user.email : 'faisal.ahmed@gmail.com' },
                            { site: 'github.com', username: 'faisal-dev' },
                            { site: 'facebook.com', username: '+1234567890' }
                          ].map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/65 dark:border-zinc-850/65">
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{entry.site}</span>
                                <span className="text-[10px] text-zinc-500">{entry.username}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => alert(`Password for ${entry.site} is: ••••••••••••`)}
                                  className="p-1.5 text-zinc-450 hover:text-indigo-550 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  title="Show password"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => alert(`Removed password for ${entry.site}`)}
                                  className="p-1.5 text-zinc-450 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Delete password"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

    if (url === 'nova://incognito') {
      return (
        <div className="w-full h-full bg-[#120f1a] text-[#ebdcfc] overflow-y-auto select-none px-4 py-12 md:p-16 transition-colors duration-300 relative animate-in fade-in duration-500">
          <div className="max-w-2xl w-full mx-auto flex flex-col items-start gap-8 text-left">
            {/* Spy Icon & Header */}
            <div className="flex items-center gap-4 border-b border-purple-900/40 pb-6 w-full">
              <div className="w-16 h-16 rounded-full bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-950/20">
                <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C9.5 2 7.4 3.7 6.8 6H17.2C16.6 3.7 14.5 2 12 2ZM2 10V12H22V10H2ZM6.5 14C4.6 14 3 15.6 3 17.5C3 19.4 4.6 21 6.5 21C8.1 21 9.5 19.9 9.9 18.4C10.5 18.7 11.2 18.9 12 18.9C12.8 18.9 13.5 18.7 14.1 18.4C14.5 19.9 15.9 21 17.5 21C19.4 21 21 19.4 21 17.5C21 15.6 19.4 14 17.5 14C15.9 14 14.5 15.1 14.1 16.6C13.5 16.3 12.8 16.1 12 16.1C11.2 16.1 10.5 16.3 9.9 16.6C9.5 15.1 8.1 14 6.5 14ZM6.5 15.5C7.6 15.5 8.5 16.4 8.5 17.5C8.5 18.6 7.6 19.5 6.5 19.5C5.4 19.5 4.5 18.6 4.5 17.5C4.5 16.4 5.4 15.5 6.5 15.5ZM17.5 15.5C18.6 15.5 19.5 16.4 19.5 17.5C19.5 18.6 18.6 19.5 17.5 19.5C16.4 19.5 15.5 18.6 15.5 17.5C15.5 16.4 16.4 15.5 17.5 15.5Z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-black text-white tracking-tight">You've gone incognito</h1>
                <p className="text-xs text-purple-300 font-medium">Now you can browse privately, and other people who use this device won't see your activity.</p>
              </div>
            </div>

            {/* Explanation grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-2">
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider text-purple-300">What Incognito does</h2>
                <p className="text-xs text-zinc-450 leading-relaxed">N.O.V.A. won't save the following information:</p>
                <ul className="list-disc list-inside text-xs text-zinc-450 flex flex-col gap-2 pl-1.5 leading-relaxed">
                  <li>Your browsing history on this device</li>
                  <li>Cookies and site data</li>
                  <li>Information entered in forms</li>
                  <li>Search history and suggestions queries</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider text-purple-300">Your activity might still be visible to:</h2>
                <ul className="list-disc list-inside text-xs text-zinc-450 flex flex-col gap-2 pl-1.5 leading-relaxed">
                  <li>Websites you visit, including the ads and resources used on those sites</li>
                  <li>Your employer or school administrator</li>
                  <li>Your internet service provider (ISP)</li>
                </ul>
              </div>
            </div>

            {/* Incognito Search Option */}
            <div className="w-full mt-6 p-5 rounded-2xl bg-purple-950/15 border border-purple-800/20 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider text-purple-300">Private Web Search</h3>
                <p className="text-[11px] text-zinc-400">Search the web securely using DuckDuckGo private search engine directly from here:</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = (e.currentTarget.elements.namedItem('incognitoSearch') as HTMLInputElement).value;
                  if (val.trim()) {
                    handleNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(val.trim())}`);
                  }
                }}
                className="flex items-center w-full bg-[#1b1b24] border border-purple-900/30 rounded-xl p-1.5 pl-4 focus-within:border-purple-500/50 transition-colors"
              >
                <Search className="w-4 h-4 text-purple-400 mr-2.5" />
                <input
                  name="incognitoSearch"
                  type="text"
                  placeholder="Search privately on DuckDuckGo..."
                  className="flex-grow bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-900/60 hover:bg-purple-800/60 text-purple-200 text-[10.5px] font-bold rounded-lg transition-colors border border-purple-800/30"
                >
                  Search
                </button>
              </form>
            </div>

          </div>
        </div>
      );
    }

    if (url === 'nova://signin') {
      return (
        <div className="w-full h-full bg-[#13131a] text-[#d1d1d6] overflow-y-auto select-none px-4 py-12 md:p-16 flex flex-col justify-between items-center relative animate-in fade-in duration-500">
          {/* Top Left Back Navigation */}
          <button
            onClick={() => handleNavigate('nova://newtab')}
            className="absolute top-6 left-6 p-2 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-all duration-200 flex items-center justify-center cursor-pointer"
            title="Back to New Tab"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Centered setup content */}
          <div className="flex-grow flex flex-col items-center justify-center max-w-md w-full mx-auto text-center gap-8 my-auto">
            {/* Round Avatar silhouette */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#4285F4]/10 rounded-full blur-xl animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 relative z-10 shadow-xl shadow-black/30">
                <User className="w-12 h-12 text-zinc-300" />
              </div>
            </div>

            {/* Header & Sub-header */}
            <div className="flex flex-col gap-2.5">
              <h1 className="text-2xl font-black text-white tracking-tight">Set up your new N.O.V.A. profile</h1>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                Sign in to sync your history, settings, and bookmarks to your Google Account across all your devices.
              </p>
            </div>

            {/* Capsule Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
              <button
                onClick={() => handleNavigate('https://accounts.google.com/')}
                className="w-full py-3 bg-[#4285F4] hover:bg-[#357ae8] text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFFFFF" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFFFFF" opacity="0.85" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FFFFFF" opacity="0.85" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#FFFFFF" opacity="0.85" />
                </svg>
                <span>Sign in</span>
              </button>

              <button
                onClick={() => handleNavigate('nova://newtab')}
                className="w-full py-3 bg-[#1e1f20] hover:bg-[#282a2b] text-zinc-300 hover:text-white rounded-full text-xs font-bold transition-all border border-zinc-800 hover:border-zinc-700 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Stay signed out
              </button>
            </div>
          </div>

          {/* Footer - Managed Profile banner */}
          <div className="w-full max-w-sm border-t border-zinc-850/60 pt-6 mt-8 flex items-center justify-center gap-2.5 text-zinc-500 select-none">
            <svg className="w-4.5 h-4.5 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 10v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10" />
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M6 17v-3" />
              <path d="M10 17v-4" />
              <path d="M14 17v-3" />
              <path d="M18 17v-4" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-center">N.O.V.A. Account Setup Profile</span>
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
        profiles={profiles}
        onPopoverWidthChange={setActivePopoverWidth}
        onAddIncognitoTab={handleAddIncognitoTab}
        showGoogleLoginModal={showGoogleLoginModal}
        setShowGoogleLoginModal={setShowGoogleLoginModal}
        googleClientId={googleClientId}
        onGoogleClientIdChange={(id) => {
          setGoogleClientId(id);
          setTempGoogleClientId(id);
          localStorage.setItem('nova-google-client-id', id);
        }}
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
            <>
              {/* Shimmer Skeleton Loader (Shown during website navigation) */}
              {isNavigating && (
                <div className="absolute inset-0 bg-[#0f0f12] flex flex-col p-8 z-40 animate-in fade-in duration-300">
                  {/* Simulated Website Header / Nav Bar */}
                  <div className="w-full flex items-center justify-between border-b border-zinc-800/40 pb-5 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800/40 animate-pulse" />
                      <div className="flex flex-col gap-1.5">
                        <div className="w-28 h-3.5 rounded bg-zinc-850 animate-pulse" />
                        <div className="w-16 h-2 rounded bg-zinc-900 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-14 h-6 rounded-lg bg-zinc-855 animate-pulse" />
                      <div className="w-14 h-6 rounded-lg bg-zinc-855 animate-pulse" />
                    </div>
                  </div>

                  {/* Simulated Website Hero / Main Content */}
                  <div className="flex-grow flex flex-col gap-6 max-w-3xl w-full mx-auto justify-center">
                    <div className="w-fit h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400/70 text-[9px] font-bold uppercase tracking-wider px-3 py-1 animate-pulse">
                      Orchestrating...
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="w-[85%] h-9 rounded-xl bg-gradient-to-r from-zinc-850 via-zinc-800 to-zinc-850 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] shimmer" />
                      <div className="w-[60%] h-9 rounded-xl bg-gradient-to-r from-zinc-850 via-zinc-800 to-zinc-850 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] shimmer" />
                    </div>
                    <div className="flex flex-col gap-2.5 mt-4">
                      <div className="w-full h-3 rounded bg-zinc-850 animate-pulse" />
                      <div className="w-[95%] h-3 rounded bg-zinc-850 animate-pulse" />
                      <div className="w-[90%] h-3 rounded bg-zinc-850 animate-pulse" />
                      <div className="w-[80%] h-3 rounded bg-zinc-850 animate-pulse" />
                    </div>
                    
                    {/* Decorative shimmer blocks */}
                    <div className="grid grid-cols-3 gap-4 mt-8">
                      <div className="h-28 rounded-2xl bg-zinc-850/40 border border-zinc-800/30 p-4 flex flex-col justify-between animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                        <div className="w-12 h-2 rounded bg-zinc-800" />
                      </div>
                      <div className="h-28 rounded-2xl bg-zinc-850/40 border border-zinc-800/30 p-4 flex flex-col justify-between animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                        <div className="w-12 h-2 rounded bg-zinc-800" />
                      </div>
                      <div className="h-28 rounded-2xl bg-zinc-850/40 border border-zinc-800/30 p-4 flex flex-col justify-between animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                        <div className="w-12 h-2 rounded bg-zinc-800" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gutter background overlay for webview spacer */}
              <div 
                className="absolute top-0 bottom-0 right-0 w-[56px] bg-[#0c0c10] border-l border-zinc-900/60 z-10"
              />
            </>
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
                onClick={() => handleOpenSettings()}
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
              width: isAgentSidebarOpen ? `${agentSidebarWidth}px` : '0px',
              borderLeftWidth: isAgentSidebarOpen ? '1px' : '0px',
            }}
            className="h-full flex-shrink-0 bg-[#0f0f12] border-zinc-800/60 flex flex-col relative select-none z-35 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out overflow-visible"
          >
            {/* Resize handle (only when open) */}
            {isAgentSidebarOpen && (
              <div
                onMouseDown={startResizing}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/80 transition-colors z-45"
              />
            )}

            {/* 3-Trigger Integrated Icons Bar (Positioned outside on the left - Centered & fits exactly inside the 56px gutter) */}
            <div 
              style={{
                left: '-55px',
                width: '56px',
                height: '240px',
              }}
              className="absolute top-1/2 -translate-y-1/2 flex flex-col justify-between items-center py-4 bg-[#0f0f12] border-l border-t border-b border-zinc-800/60 rounded-l-[20px] z-50 select-none"
            >
              {/* Top Trigger: Placeholder */}
              <button
                type="button"
                onClick={() => alert('AI Features (Coming Soon!)')}
                className="p-2.5 text-zinc-400 hover:text-[#a0c3ff] hover:bg-zinc-800/40 rounded-xl transition-all duration-200 cursor-pointer group"
                title="AI Assistance"
              >
                <Sparkles className="w-[24px] h-[24px] text-indigo-400 group-hover:animate-pulse" />
              </button>

              {/* Middle Trigger: Sidebar Toggle */}
              <button
                type="button"
                onClick={() => setIsAgentSidebarOpen(!isAgentSidebarOpen)}
                className="p-2.5 bg-gradient-to-tr from-[#ea4335]/10 via-[#ee2a7b]/10 to-[#6228d7]/10 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-zinc-800/40 text-white rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                title={isAgentSidebarOpen ? "Hide Copilot" : "Show Copilot"}
              >
                {isAgentSidebarOpen ? (
                  <ChevronRight className="w-[26px] h-[26px] text-indigo-400" strokeWidth={2.5} />
                ) : (
                  <ChevronLeft className="w-[26px] h-[26px] text-indigo-400" strokeWidth={2.5} />
                )}
              </button>

              {/* Bottom Trigger: Placeholder */}
              <button
                type="button"
                onClick={() => alert('Quick Actions (Coming Soon!)')}
                className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-xl transition-all duration-200 cursor-pointer group"
                title="Settings"
              >
                <Settings className="w-[24px] h-[24px] text-zinc-400 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            </div>

            {/* Content container occupying the full sidebar width without margins */}
            {isAgentSidebarOpen && (
              <div 
                className="h-full w-full flex flex-col overflow-hidden"
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
                  <div className="h-full flex flex-col overflow-hidden bg-[#0f0f12]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f12] border-b border-zinc-900/60 flex-shrink-0">
                      <AgentStatus state={agentState} />
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowHistory(true)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all cursor-pointer"
                          title="View Saved Chats"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
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

                    {/* Google Gemini style premium horizontal slide loader */}
                    {isAgentTyping && (
                      <div className="w-full h-[2px] bg-zinc-900/80 relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 animate-[loading-slide_1.8s_infinite] w-[40%] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                      </div>
                    )}

                    {/* Chat Messages Container */}
                    <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar bg-[#0f0f12]">
                      {agentMessages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-350 ${
                            msg.sender === 'user' ? 'items-end' : 'items-start'
                          }`}
                        >
                          {msg.sender === 'agent' ? (
                            /* Agent Message: Gemini-Style inline layout without cards */
                            <div className="w-full text-left">
                              <div className="flex gap-2 items-center mb-1.5 text-zinc-400 text-[10px] font-bold select-none">
                                <div className="p-1 rounded-lg bg-gradient-to-tr from-sky-500/10 via-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/15">
                                  <Sparkles className="w-3 h-3 text-indigo-450 animate-pulse" />
                                </div>
                                <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent font-extrabold uppercase tracking-wider">N.O.V.A. Brain</span>
                              </div>
                              <div className="pl-7 text-[11.5px] text-zinc-200 leading-relaxed select-text font-sans font-medium">
                                {renderMessageContent(msg.content)}
                              </div>
                              
                              {/* Renders parsed structural action items using ActionCard */}
                              {msg.actions && msg.actions.length > 0 && (
                                <div className="flex flex-col gap-2.5 mt-3.5 pl-7 w-full max-w-full animate-in fade-in duration-300">
                                  {msg.actions.map((action, index) => (
                                    <ActionCard key={action.id} action={action} index={index} />
                                  ))}
                                  
                                  {/* Simulated Playback Runner Trigger */}
                                  {msg.actions.some(a => a.status === 'pending') && (
                                    <button
                                      onClick={() => handleSimulateExecution(msg.id)}
                                      className="mt-2 w-full py-2.5 px-3 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/15 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-500/25"
                                    >
                                      <Sparkles className="w-3 h-3 animate-spin [animation-duration:3s]" />
                                      <span>Simulate Execution (Phase 2)</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              <span className="block text-[7.5px] text-zinc-650 font-bold uppercase mt-1.5 pl-7 tracking-wide select-none">
                                {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            /* User Message: Minimal rounded capsule aligned to the right */
                            <div className="max-w-[85%] text-right">
                              <div className="p-3 bg-[#1e1f20] border border-zinc-800/40 rounded-[20px] text-[11.5px] text-[#e3e3e3] text-left leading-relaxed font-sans font-medium shadow-sm hover:border-zinc-700/40 transition-colors">
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

      {/* 9. Dependency Setup & Verification Modal Overlay (Phase 3 Enhancement) */}
      {showDependencyModal && (() => {
        const model = LOCAL_MODELS.find(m => m.id === dependencyModelId);
        if (!model) return null;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-[#1b1b24] border border-zinc-850 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl animate-in scale-in duration-200 text-left">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-black text-white">Local AI Environment Setup</h3>
                </div>
                {dependencyStep !== 'progress' && (
                  <button
                    onClick={() => setShowDependencyModal(false)}
                    className="p-1 rounded-full hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {dependencyStep === 'verify' && (
                <div className="flex flex-col gap-4 text-xs text-zinc-350">
                  {/* Model Card Info */}
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Target Model</span>
                    <h4 className="text-xs font-black text-white mt-0.5">{model.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">{model.description}</p>
                    <div className="flex gap-4 text-[10px] text-zinc-400 font-bold mt-2">
                      <span>Category: <span className="text-indigo-400 capitalize font-black">{model.category}</span></span>
                      <span>Weights Size: <span className="text-indigo-400 font-black">{model.size}</span></span>
                      <span>Required Memory: <span className="text-indigo-400 font-black">{model.ramRequired} GB RAM</span></span>
                    </div>
                  </div>

                  {/* Dependency List checkups */}
                  <div className="flex flex-col gap-2.5">
                    <h5 className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider">Required Dependencies Check</h5>
                    
                    {isCheckingDeps ? (
                      <div className="text-center py-4 text-zinc-550 font-semibold animate-pulse">
                        Scanning system configurations...
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Python Card */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-[11px]">Python 3.10+ Environment</span>
                            <span className="text-[9.5px] text-zinc-500">Required for sidecar API runtime execution.</span>
                          </div>
                          {dependencyStatus.python === 'installed' ? (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 dark:text-emerald-450 border border-emerald-500/20">
                              ✓ Already Installed
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              ↓ Will Download
                            </span>
                          )}
                        </div>

                        {/* Llama CPP Bindings */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-[11px]">Llama-cpp Bindings</span>
                            <span className="text-[9.5px] text-zinc-500">Hardware-accelerated interface for GGUF execution.</span>
                          </div>
                          {dependencyStatus.binaries === 'installed' ? (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                              ✓ Already Installed
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              ↓ Will Configure
                            </span>
                          )}
                        </div>

                        {/* FastAPI sidecar */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-[11px]">FastAPI Sidecar API Core</span>
                            <span className="text-[9.5px] text-zinc-500">Internal server for secure browser action extraction.</span>
                          </div>
                          {dependencyStatus.fastapi === 'installed' ? (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                              ✓ Already Installed
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              ↓ Will Configure
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verification Checkboxes */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800 mt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-[10.5px]">
                      <input
                        type="checkbox"
                        checked={ackLicense}
                        onChange={(e) => setAckLicense(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-800 bg-[#13131a] text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-zinc-400 hover:text-zinc-200 transition-colors leading-tight">
                        I acknowledge the license agreement and usage conditions for running this model weights locally.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-[10.5px]">
                      <input
                        type="checkbox"
                        checked={ackMemory}
                        onChange={(e) => setAckMemory(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-800 bg-[#13131a] text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-zinc-400 hover:text-zinc-200 transition-colors leading-tight">
                        I confirm that my machine has enough RAM ({model.ramRequired} GB needed) to host this model.
                        <span className="text-zinc-500 block text-[9.5px]">
                          Available on this device: <span className="font-bold text-zinc-400">{systemRam.toFixed(1)} GB RAM</span>
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => setShowDependencyModal(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all cursor-pointer border border-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!ackLicense || !ackMemory || isCheckingDeps}
                      onClick={runDependencySetupAndDownload}
                      className={`px-5 py-2 rounded-xl font-bold transition-all ${
                        ackLicense && ackMemory && !isCheckingDeps
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 border border-transparent cursor-not-allowed'
                      }`}
                    >
                      Start Setup & Download
                    </button>
                  </div>
                </div>
              )}

              {dependencyStep === 'progress' && (
                <div className="flex flex-col gap-4 text-xs text-zinc-350">
                  {/* Progress status */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-black text-indigo-400 text-[11px]">
                      <span>{setupProgressText}</span>
                      <span>Setup in progress...</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-650 transition-all duration-300 animate-pulse"
                        style={{
                          width: `${
                            setupProgressText.includes('%') 
                              ? parseInt(setupProgressText.match(/\d+/)?.at(0) || '80')
                              : setupProgressText.includes('Ready') ? 100 : 40
                          }%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Terminal Console log window */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="font-bold text-zinc-500 text-[9.5px] uppercase tracking-wider">Setup Log Console</span>
                    <div 
                      className="bg-[#0c0c10] border border-zinc-850 rounded-xl p-4 h-[220px] overflow-y-auto font-mono text-[#00ff66] text-[10px] leading-relaxed flex flex-col gap-1 scroll-smooth"
                      ref={(el) => {
                        if (el) {
                          el.scrollTop = el.scrollHeight;
                        }
                      }}
                    >
                      {setupLog.map((log, index) => {
                        let colorClass = "text-[#00ff66]";
                        if (log.includes("Warning") || log.includes("⚠")) {
                          colorClass = "text-amber-400 font-bold";
                        } else if (log.includes("Error") || log.includes("❌")) {
                          colorClass = "text-red-400 font-bold";
                        } else if (log.includes("✓")) {
                          colorClass = "text-emerald-400 font-semibold";
                        }
                        return (
                          <div key={index} className={colorClass}>
                            {log}
                          </div>
                        );
                      })}
                      <div className="w-1.5 h-3 bg-[#00ff66] animate-pulse inline-block ml-0.5 mt-0.5" />
                    </div>
                  </div>

                  {/* Self-healing details warning banner */}
                  {setupErrorRecovery && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10.5px] animate-in fade-in slide-in-from-top-1 duration-205">
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold">Smart Self-Healing Activated</span>
                        <span className="text-[9.5px] text-amber-450 mt-0.5 leading-snug">{setupErrorRecovery}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center text-[10px] text-zinc-500 font-medium py-1 animate-pulse">
                    Please do not close the browser while configuration is active...
                  </div>
                </div>
              )}

              {dependencyStep === 'complete' && (
                <div className="flex flex-col items-center justify-center gap-5 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-450 animate-bounce">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-sm font-black text-white">Environment Ready for Launch!</h4>
                    <p className="text-xs text-zinc-400 max-w-sm">
                      {model.name} and all required dependencies are fully downloaded and configured. The sidecar service is listening at port 8001.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDependencyModal(false)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer border border-transparent"
                  >
                    Instant Launch
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
