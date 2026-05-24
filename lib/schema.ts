export type ActionType = 'navigate' | 'extract' | 'click' | 'wait' | 'done';

export interface AgentAction {
  id: string;
  action: ActionType;
  url?: string;
  target?: string; // Target text/element for extraction or clicking
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string; // Captured output or coordinates representation
  error?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  actions?: AgentAction[];
}
