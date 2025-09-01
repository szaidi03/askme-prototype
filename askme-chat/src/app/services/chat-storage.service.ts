import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ChatSession, StoredChatSession, StoredChatMessage, ChatStorageOptions } from '../models/chat-storage.models';

@Injectable({
  providedIn: 'root'
})
export class ChatStorageService {
  private readonly DB_NAME = 'AskMeChatDB';
  private readonly DB_VERSION = 1;
  private readonly SESSIONS_STORE = 'chatSessions';
  private readonly MESSAGES_STORE = 'chatMessages';
  
  private db: IDBDatabase | null = null;
  private sessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  
  public sessions$ = this.sessionsSubject.asObservable();
  
  private options: ChatStorageOptions = {
    autoSave: true,
    maxSessions: 50,
    maxMessagesPerSession: 1000
  };

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.loadSessions();
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create sessions store
        if (!db.objectStoreNames.contains(this.SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(this.SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
          sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        // Create messages store
        if (!db.objectStoreNames.contains(this.MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(this.MESSAGES_STORE, { keyPath: 'id' });
          messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  private async loadSessions(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(this.SESSIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sessions = request.result.sort((a, b) => b.updatedAt - a.updatedAt);
        this.sessionsSubject.next(sessions);
      };
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  async createSession(name: string, initialMessages?: StoredChatMessage[], apiSessionId?: string): Promise<string> {
    const db = await this.ensureDB();
    const sessionId = this.generateId();
    const now = Date.now();
    
    const session: ChatSession = {
      id: sessionId,
      name: name || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      messageCount: initialMessages?.length || 0,
      lastMessage: initialMessages?.length ? initialMessages[initialMessages.length - 1].content : undefined,
      apiSessionId: apiSessionId // Store the API session ID for backend continuity
    };

    const transaction = db.transaction([this.SESSIONS_STORE, this.MESSAGES_STORE], 'readwrite');
    
    try {
      // Save session
      const sessionsStore = transaction.objectStore(this.SESSIONS_STORE);
      await this.promisifyRequest(sessionsStore.add(session));
      
      // Save initial messages if provided
      if (initialMessages && initialMessages.length > 0) {
        const messagesStore = transaction.objectStore(this.MESSAGES_STORE);
        for (const message of initialMessages) {
          const storedMessage = { ...message, sessionId };
          await this.promisifyRequest(messagesStore.add(storedMessage));
        }
      }
      
      await this.loadSessions();
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async saveMessage(sessionId: string, message: StoredChatMessage): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.SESSIONS_STORE, this.MESSAGES_STORE], 'readwrite');
    
    try {
      // Save message
      const messagesStore = transaction.objectStore(this.MESSAGES_STORE);
      const storedMessage = { ...message, sessionId, timestamp: Date.now() };
      await this.promisifyRequest(messagesStore.add(storedMessage));
      
      // Update session metadata
      const sessionsStore = transaction.objectStore(this.SESSIONS_STORE);
      const session = await this.promisifyRequest(sessionsStore.get(sessionId)) as ChatSession;
      
      if (session) {
        session.updatedAt = Date.now();
        session.messageCount = (session.messageCount || 0) + 1;
        session.lastMessage = message.content.substring(0, 100);
        await this.promisifyRequest(sessionsStore.put(session));
      }
      
      await this.loadSessions();
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<StoredChatSession | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.SESSIONS_STORE, this.MESSAGES_STORE], 'readonly');
    
    try {
      // Get session
      const sessionsStore = transaction.objectStore(this.SESSIONS_STORE);
      const session = await this.promisifyRequest(sessionsStore.get(sessionId)) as ChatSession;
      
      if (!session) return null;
      
      // Get messages
      const messagesStore = transaction.objectStore(this.MESSAGES_STORE);
      const index = messagesStore.index('sessionId');
      const messages = await this.promisifyRequest(index.getAll(sessionId)) as (StoredChatMessage & { sessionId: string })[];
      
      const storedMessages = messages
        .map(m => ({ ...m, sessionId: undefined }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      return {
        ...session,
        messages: storedMessages
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  async updateSessionName(sessionId: string, newName: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.SESSIONS_STORE], 'readwrite');
    
    try {
      const store = transaction.objectStore(this.SESSIONS_STORE);
      const session = await this.promisifyRequest(store.get(sessionId)) as ChatSession;
      
      if (session) {
        session.name = newName;
        session.updatedAt = Date.now();
        await this.promisifyRequest(store.put(session));
        await this.loadSessions();
      }
    } catch (error) {
      console.error('Failed to update session name:', error);
      throw error;
    }
  }

  async updateApiSessionId(sessionId: string, apiSessionId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.SESSIONS_STORE], 'readwrite');
    
    try {
      const store = transaction.objectStore(this.SESSIONS_STORE);
      const session = await this.promisifyRequest(store.get(sessionId)) as ChatSession;
      
      if (session) {
        session.apiSessionId = apiSessionId;
        session.updatedAt = Date.now();
        await this.promisifyRequest(store.put(session));
        await this.loadSessions();
        console.log('Updated API session ID for session:', sessionId, 'to:', apiSessionId);
      }
    } catch (error) {
      console.error('Failed to update API session ID:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.SESSIONS_STORE, this.MESSAGES_STORE], 'readwrite');
    
    try {
      // Delete session
      const sessionsStore = transaction.objectStore(this.SESSIONS_STORE);
      await this.promisifyRequest(sessionsStore.delete(sessionId));
      
      // Delete all messages for this session
      const messagesStore = transaction.objectStore(this.MESSAGES_STORE);
      const index = messagesStore.index('sessionId');
      const request = index.openCursor(IDBKeyRange.only(sessionId));
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
      
      await this.loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  async clearAllSessions(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.SESSIONS_STORE, this.MESSAGES_STORE], 'readwrite');
    
    try {
      const sessionsStore = transaction.objectStore(this.SESSIONS_STORE);
      const messagesStore = transaction.objectStore(this.MESSAGES_STORE);
      
      await this.promisifyRequest(sessionsStore.clear());
      await this.promisifyRequest(messagesStore.clear());
      
      this.sessionsSubject.next([]);
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
      throw error;
    }
  }

  getSessions(): Observable<ChatSession[]> {
    return this.sessions$;
  }

  getCurrentSessions(): ChatSession[] {
    return this.sessionsSubject.value;
  }

  private promisifyRequest<T = any>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}