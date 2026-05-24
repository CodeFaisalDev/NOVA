'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message, AgentAction } from '@/lib/schema';
import ActionCard from './ActionCard';
import { Send, Sparkles, Terminal, User } from 'lucide-react';

interface ChatSidebarProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isProcessing: boolean;
}

export default function ChatSidebar({ messages, onSendMessage, isProcessing }: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-l border-zinc-200/60 dark:border-zinc-800/80 shadow-2xl shadow-black/10">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-500/10">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-150 tracking-wide uppercase">N.O.V.A. Agent</h2>
            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">Orchestrated Visual Browser</p>
          </div>
        </div>
      </div>

      {/* Message History List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12 px-6">
            <Terminal className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-3" />
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Begin Automation</h3>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 max-w-[200px] leading-relaxed">
              Enter a URL to navigate the shell or describe a task for the agent.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[90%] ${
                msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[10px] border shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-zinc-100 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-650'
                    : 'bg-indigo-50 border-indigo-150 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              {/* Message Content Bubble */}
              <div className="flex flex-col gap-2">
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-zinc-800 text-white rounded-tr-none dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                      : 'bg-zinc-50 border border-zinc-200/50 text-zinc-850 dark:bg-zinc-900/40 dark:border-zinc-850 dark:text-zinc-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Associated actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1 min-w-[260px] sm:min-w-[280px]">
                    {msg.actions.map((action, index) => (
                      <ActionCard key={action.id} action={action} index={index} />
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[9px] text-zinc-400 dark:text-zinc-600 font-medium pl-1 self-start">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-1.5 focus-within:border-zinc-350 dark:focus-within:border-zinc-700 transition-all shadow-xs">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type URL or instruction..."
            disabled={isProcessing}
            className="flex-1 px-3 py-1.5 text-xs bg-transparent focus:outline-hidden text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-850 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-30 disabled:hover:scale-100 hover:scale-[1.03] active:scale-[0.97] transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
