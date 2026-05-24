'use client';

import React from 'react';
import { Cpu, Eye, Sparkles, Terminal } from 'lucide-react';

export type AgentState = 'idle' | 'planning' | 'navigating' | 'extracting' | 'done' | 'failed';

interface AgentStatusProps {
  state: AgentState;
}

export default function AgentStatus({ state }: AgentStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'planning':
        return {
          label: 'Planning',
          sub: 'Omniscient (Cloud LLM)',
          color: 'from-amber-400 to-orange-500',
          textColor: 'text-amber-400',
          icon: Sparkles,
          glow: 'shadow-amber-500/20',
          pulse: 'animate-pulse',
        };
      case 'navigating':
        return {
          label: 'Navigating',
          sub: 'Phi-4 Multimodal (Vision)',
          color: 'from-blue-400 to-indigo-500',
          textColor: 'text-blue-400',
          icon: Eye,
          glow: 'shadow-blue-500/20',
          pulse: 'animate-pulse',
        };
      case 'extracting':
        return {
          label: 'Extracting',
          sub: 'Gemini Nano (Local LLM)',
          color: 'from-emerald-400 to-teal-500',
          textColor: 'text-emerald-400',
          icon: Cpu,
          glow: 'shadow-emerald-500/20',
          pulse: 'animate-pulse',
        };
      case 'done':
        return {
          label: 'Task Complete',
          sub: 'Awaiting Prompt',
          color: 'from-purple-500 to-pink-500',
          textColor: 'text-purple-400',
          icon: Terminal,
          glow: 'shadow-purple-500/20',
          pulse: '',
        };
      case 'failed':
        return {
          label: 'Execution Failed',
          sub: 'Error Occurred',
          color: 'from-red-500 to-rose-600',
          textColor: 'text-red-400',
          icon: Terminal,
          glow: 'shadow-red-500/20',
          pulse: '',
        };
      case 'idle':
      default:
        return {
          label: 'System Idle',
          sub: 'Ready for Task',
          color: 'from-zinc-400 to-zinc-600 dark:from-zinc-500 dark:to-zinc-700',
          textColor: 'text-zinc-400 dark:text-zinc-500',
          icon: Terminal,
          glow: 'shadow-zinc-500/10',
          pulse: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md shadow-lg ${config.glow} transition-all duration-500`}>
      <div className="relative flex items-center justify-center">
        {/* Glow behind the status orb */}
        <span className={`absolute inline-flex h-4 w-4 rounded-full bg-gradient-to-r ${config.color} opacity-75 blur-xs ${config.pulse}`}></span>
        {/* Inner core orb */}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r ${config.color}`}></span>
      </div>
      
      <div className="flex flex-col min-w-[130px]">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
          <span className="text-xs font-semibold tracking-wide uppercase text-zinc-800 dark:text-zinc-200">
            {config.label}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          {config.sub}
        </span>
      </div>
    </div>
  );
}
