export interface StoredChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: number;
  isStreaming?: boolean;
  error?: boolean;
}

export interface ChatSession {
  id: string; // Local storage session ID
  name: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
  apiSessionId?: string; // API session ID for backend continuity
}

export interface StoredChatSession extends ChatSession {
  messages: StoredChatMessage[];
}

export interface ChatStorageOptions {
  autoSave?: boolean;
  maxSessions?: number;
  maxMessagesPerSession?: number;
}