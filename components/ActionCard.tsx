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
        return <Compass className="w-4 h-4 text-blue-500" />;
      case 'extract':
        return <Cpu className="w-4 h-4 text-emerald-500" />;
      case 'click':
        return <Eye className="w-4 h-4 text-indigo-500" />;
      case 'wait':
        return <Hourglass className="w-4 h-4 text-amber-500" />;
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStatusStyle = () => {
    switch (action.status) {
      case 'running':
        return {
          border: 'border-blue-500/30 dark:border-blue-500/20',
          bg: 'bg-blue-50/50 dark:bg-blue-950/10',
          indicator: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
        };
      case 'completed':
        return {
          border: 'border-emerald-500/30 dark:border-emerald-500/20',
          bg: 'bg-emerald-50/30 dark:bg-emerald-950/5',
          indicator: <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />,
        };
      case 'failed':
        return {
          border: 'border-red-500/30 dark:border-red-500/20',
          bg: 'bg-red-50/50 dark:bg-red-950/10',
          indicator: <XCircle className="w-4 h-4 text-red-500 fill-red-500/10" />,
        };
      case 'pending':
      default:
        return {
          border: 'border-zinc-200/60 dark:border-zinc-800/60',
          bg: 'bg-zinc-50/40 dark:bg-zinc-900/10',
          indicator: <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />,
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div className={`flex flex-col gap-2.5 p-3.5 rounded-xl border ${statusStyle.border} ${statusStyle.bg} backdrop-blur-xs transition-all duration-300`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-150 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            #{index + 1}
          </span>
          <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-700 dark:text-zinc-300 capitalize">
            {getActionIcon()}
            {action.action}
          </div>
        </div>
        <div>
          {statusStyle.indicator}
        </div>
      </div>

      <div className="text-xs text-zinc-650 dark:text-zinc-400 break-words leading-relaxed font-sans pl-6">
        {action.action === 'navigate' && action.url && (
          <span className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
            {action.url}
          </span>
        )}
        {action.action === 'extract' && action.target && (
          <span>Extract: <strong className="text-zinc-800 dark:text-zinc-200">{action.target}</strong></span>
        )}
        {action.action === 'click' && action.target && (
          <span>Click visual target: <strong className="text-zinc-800 dark:text-zinc-200">{action.target}</strong></span>
        )}
        {action.action === 'wait' && (
          <span>Waiting for page state stabilizers</span>
        )}
        {action.action === 'done' && (
          <span className="text-purple-600 dark:text-purple-400 font-medium">Task accomplished successfully!</span>
        )}
      </div>

      {action.result && (
        <div className="mt-1 pl-6">
          <div className="text-[10px] uppercase font-bold text-zinc-450 dark:text-zinc-500 mb-1 tracking-wider">Result</div>
          <pre className="text-[10px] font-mono p-2 bg-white/50 dark:bg-black/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-lg overflow-x-auto text-zinc-700 dark:text-zinc-350 max-h-32">
            {action.result}
          </pre>
        </div>
      )}

      {action.error && (
        <div className="mt-1 pl-6">
          <div className="text-[10px] uppercase font-bold text-red-400 mb-1 tracking-wider">Error</div>
          <div className="text-xs font-mono p-2 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 dark:text-red-400">
            {action.error}
          </div>
        </div>
      )}
    </div>
  );
}
