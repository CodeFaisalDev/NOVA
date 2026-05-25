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
          label: 'Omniscient Planning',
          sub: 'Cloud LLM Orchestrator',
          color: 'from-amber-400 via-orange-400 to-amber-500',
          textColor: 'text-amber-400',
          icon: Sparkles,
          glow: 'shadow-amber-500/20 border-amber-500/20 bg-amber-500/5',
          pulse: 'animate-ping',
        };
      case 'navigating':
        return {
          label: 'Visual Navigation',
          sub: 'Phi-4 Multimodal Eyes',
          color: 'from-sky-400 via-indigo-400 to-purple-500',
          textColor: 'text-sky-400',
          icon: Eye,
          glow: 'shadow-indigo-500/20 border-indigo-500/20 bg-indigo-500/5',
          pulse: 'animate-ping',
        };
      case 'extracting':
        return {
          label: 'Data Extraction',
          sub: 'Gemini Nano Hands',
          color: 'from-teal-400 via-emerald-400 to-emerald-500',
          textColor: 'text-emerald-400',
          icon: Cpu,
          glow: 'shadow-emerald-500/20 border-emerald-500/20 bg-emerald-500/5',
          pulse: 'animate-ping',
        };
      case 'done':
        return {
          label: 'Task Accomplished',
          sub: 'Awaiting Next Objective',
          color: 'from-violet-400 via-fuchsia-400 to-pink-500',
          textColor: 'text-violet-400',
          icon: Terminal,
          glow: 'shadow-violet-500/20 border-violet-500/20 bg-violet-500/5',
          pulse: '',
        };
      case 'failed':
        return {
          label: 'Execution Fault',
          sub: 'Check System Logs',
          color: 'from-red-400 via-rose-500 to-rose-600',
          textColor: 'text-rose-400',
          icon: Terminal,
          glow: 'shadow-rose-500/20 border-rose-500/20 bg-rose-500/5',
          pulse: '',
        };
      case 'idle':
      default:
        return {
          label: 'System Ready',
          sub: 'AetherBrowser Engine',
          color: 'from-zinc-550 to-zinc-650',
          textColor: 'text-zinc-400',
          icon: Terminal,
          glow: 'shadow-zinc-500/5 border-zinc-800 bg-zinc-900/10',
          pulse: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[18px] border backdrop-blur-md shadow-lg ${config.glow} transition-all duration-500 select-none`}>
      <div className="relative flex items-center justify-center w-4 h-4">
        {/* Double-ring animated core orb */}
        {config.pulse && (
          <span className={`absolute inline-flex h-3.5 w-3.5 rounded-full bg-gradient-to-r ${config.color} opacity-30 ${config.pulse}`} />
        )}
        <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r ${config.color} opacity-60 blur-[2px]`} />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 bg-gradient-to-r ${config.color}`} />
      </div>
      
      <div className="flex flex-col min-w-[125px]">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
          <span className="text-[10.5px] font-black tracking-wider uppercase text-zinc-200">
            {config.label}
          </span>
        </div>
        <span className="text-[9.5px] text-zinc-550 font-bold tracking-normal uppercase">
          {config.sub}
        </span>
      </div>
    </div>
  );
}
