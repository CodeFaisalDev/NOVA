'use client';

import React from 'react';
import { AgentAction } from '@/lib/schema';
import { CheckCircle2, Circle, Compass, Cpu, Eye, Hourglass, Loader2, XCircle } from 'lucide-react';

interface ActionCardProps {
  action: AgentAction;
  index: number;
}

export default function ActionCard({ action, index }: ActionCardProps) {
  const getActionIcon = () => {
    switch (action.action) {
      case 'navigate':
        return <Compass className="w-3.5 h-3.5 text-sky-400" />;
      case 'extract':
        return <Cpu className="w-3.5 h-3.5 text-teal-400" />;
      case 'click':
        return <Eye className="w-3.5 h-3.5 text-indigo-400" />;
      case 'wait':
        return <Hourglass className="w-3.5 h-3.5 text-amber-400" />;
      case 'done':
        return <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getStatusConfig = () => {
    switch (action.status) {
      case 'running':
        return {
          border: 'border-sky-500/30 dark:border-sky-500/20 shadow-[0_0_12px_rgba(56,189,248,0.1)]',
          bg: 'bg-sky-500/5 dark:bg-sky-500/5',
          indicator: (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25">
              <Loader2 className="w-2.5 h-2.5 text-sky-400 animate-spin" />
              <span className="text-[8px] font-bold text-sky-400 uppercase tracking-wider">Active</span>
            </div>
          ),
        };
      case 'completed':
        return {
          border: 'border-teal-500/30 dark:border-teal-500/20 shadow-[0_0_8px_rgba(20,184,166,0.05)]',
          bg: 'bg-teal-500/5 dark:bg-teal-500/5',
          indicator: (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
              <CheckCircle2 className="w-2.5 h-2.5 text-teal-400" />
              <span className="text-[8px] font-bold text-teal-450 uppercase tracking-wider">Done</span>
            </div>
          ),
        };
      case 'failed':
        return {
          border: 'border-rose-500/30 dark:border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.1)]',
          bg: 'bg-rose-500/5 dark:bg-rose-500/5',
          indicator: (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              <XCircle className="w-2.5 h-2.5 text-rose-450" />
              <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider">Fail</span>
            </div>
          ),
        };
      case 'pending':
      default:
        return {
          border: 'border-zinc-800/80 dark:border-zinc-800/60',
          bg: 'bg-zinc-900/20 dark:bg-zinc-900/10',
          indicator: (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/40 border border-zinc-700/20">
              <Circle className="w-2.5 h-2.5 text-zinc-650" />
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Queue</span>
            </div>
          ),
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex flex-col gap-2 p-3.5 rounded-[16px] border ${config.border} ${config.bg} backdrop-blur-md transition-all duration-300`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-zinc-850/60 text-zinc-400 border border-zinc-800/60 select-none">
            {index + 1}
          </span>
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-zinc-300 uppercase tracking-wider">
            {getActionIcon()}
            <span>{action.action}</span>
          </div>
        </div>
        <div>
          {config.indicator}
        </div>
      </div>

      <div className="text-[11px] text-zinc-400 break-words leading-relaxed font-sans pl-6">
        {action.action === 'navigate' && action.url && (
          <span className="font-mono text-[10px] bg-zinc-950/60 border border-zinc-900/60 px-1.5 py-0.5 rounded text-sky-400 break-all select-text">
            {action.url}
          </span>
        )}
        {action.action === 'extract' && action.target && (
          <span>Extract target: <strong className="text-zinc-200">{action.target}</strong></span>
        )}
        {action.action === 'click' && action.target && (
          <span>Visual grounding click: <strong className="text-zinc-200">{action.target}</strong></span>
        )}
        {action.action === 'wait' && (
          <span>Waiting for webview state stabilization...</span>
        )}
        {action.action === 'done' && (
          <span className="text-violet-400 font-bold">Goal reached successfully!</span>
        )}
      </div>

      {action.result && (
        <div className="mt-1.5 pl-6">
          <div className="text-[8px] uppercase font-black text-zinc-550 mb-1 tracking-wider">Extracted Data</div>
          <pre className="text-[9.5px] font-mono p-2 bg-black/40 border border-zinc-900/50 rounded-lg overflow-x-auto text-[#a0c3ff] max-h-32 leading-relaxed select-text">
            {action.result}
          </pre>
        </div>
      )}

      {action.error && (
        <div className="mt-1.5 pl-6">
          <div className="text-[8px] uppercase font-black text-rose-500 mb-1 tracking-wider">Trace Error</div>
          <div className="text-[10px] font-mono p-2 bg-rose-950/20 border border-rose-900/35 rounded-lg text-rose-450 leading-relaxed">
            {action.error}
          </div>
        </div>
      )}
    </div>
  );
}
