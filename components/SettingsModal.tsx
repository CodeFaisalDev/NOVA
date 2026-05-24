'use client';

import React from 'react';
import { X, Moon, Sun, Laptop, Search, Home, Trash2, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  homepage: string;
  setHomepage: (homepage: string) => void;
  searchEngine: 'google' | 'bing' | 'duckduckgo';
  setSearchEngine: (engine: 'google' | 'bing' | 'duckduckgo') => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  setTheme,
  homepage,
  setHomepage,
  searchEngine,
  setSearchEngine,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleClearHistory = () => {
    alert('Browser state and cache cleared successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-md overflow-hidden bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/50 dark:border-zinc-800/80 rounded-3xl shadow-2xl flex flex-col gap-6 p-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-900/60 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-150 uppercase tracking-wider">Browser Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-905 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 overflow-y-auto max-h-[400px] pr-1">
          {/* Appearance Section */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider flex items-center gap-1.5">
              Appearance
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  theme === 'system'
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>System OS</span>
              </button>
            </div>
          </div>

          {/* Search Preferences */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider flex items-center gap-1.5">
              Navigation & Search
            </span>

            {/* Homepage input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-350 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-zinc-400" />
                <span>Homepage URL</span>
              </label>
              <input
                type="text"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                placeholder="https://www.google.com"
                className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-850 focus:border-zinc-350 dark:focus:border-zinc-750 text-zinc-800 dark:text-zinc-200 outline-hidden transition-all"
              />
            </div>

            {/* Search Engine Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-350 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <span>Search Engine</span>
              </label>
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value as any)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-850 focus:border-zinc-350 dark:focus:border-zinc-750 text-zinc-800 dark:text-zinc-200 outline-hidden transition-all"
              >
                <option value="google">Google</option>
                <option value="bing">Bing</option>
                <option value="duckduckgo">DuckDuckGo</option>
              </select>
            </div>
          </div>

          {/* Privacy & Maintenance */}
          <div className="flex flex-col gap-3 border-t border-zinc-200/50 dark:border-zinc-900/60 pt-4">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider flex items-center gap-1.5">
              Privacy & Maintenance
            </span>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-850/50">
              <div className="flex flex-col gap-0.5 max-w-[240px]">
                <span className="text-xs font-bold text-zinc-750 dark:text-zinc-300">Clear Cache & Settings</span>
                <span className="text-[10px] text-zinc-450 dark:text-zinc-500">Deletes navigation history, cookies, and resets user preferences.</span>
              </div>
              <button
                onClick={handleClearHistory}
                className="p-2 rounded-xl text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 dark:border-red-500/10 hover:border-transparent transition-all flex items-center justify-center"
                title="Clear Data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200/50 dark:border-zinc-900/60 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-850 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
