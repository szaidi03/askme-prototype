export interface StoredChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: number;
  isStreaming?: boolean;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
  sessionId?: string; // API session ID if needed
}

export interface StoredChatSession extends ChatSession {
  messages: StoredChatMessage[];
}

export interface ChatStorageOptions {
  autoSave?: boolean;
  maxSessions?: number;
  maxMessagesPerSession?: number;
}