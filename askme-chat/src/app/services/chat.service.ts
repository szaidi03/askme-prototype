import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  error?: boolean;
}

export interface StreamResponse {
  content: string;
  done: boolean;
  error?: string;
}

export interface ChatRequest {
  SessionID: string;
  UserPrompt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private sessionId = '';

  constructor() {
    this.generateSessionId();
  }

  private generateSessionId(): void {
    this.sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    console.log('Generated new API session ID:', this.sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Method to restore a specific session ID from a previous chat
  restoreSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    console.log('Restored API session ID from previous chat:', this.sessionId);
  }

  // Method to generate a new session ID for fresh chats
  generateNewSessionId(): void {
    this.generateSessionId();
  }

  // Debug method to help verify session ID synchronization
  debugSessionInfo(): void {
    console.log('=== Chat Service Session Debug ===');
    console.log('Current API Session ID:', this.sessionId);
    console.log('Session ID Length:', this.sessionId.length);
    console.log('Session ID Valid:', this.sessionId.length > 0);
    console.log('===============================');
  }

  async streamResponse(prompt: string): Promise<Response> {
    const requestBody: ChatRequest = {
      SessionID: this.sessionId,
      UserPrompt: prompt
    };

    console.log('Sending request to API:', {
      url: 'http://10.10.30.185:8000/api/suggest_catalog_stream/',
      body: requestBody
    });

    const response = await fetch('https://athena.assyst.net/api/suggest_catalog_stream/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('API Response status:', response.status);
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response;
  }

  // Observable stream of aggregated text as it arrives
  streamResponse$(prompt: string): Observable<string> {
    return new Observable<string>((observer) => {
      let cancelled = false;

      const go = async () => {
        try {
          const requestBody: ChatRequest = {
            SessionID: this.sessionId,
            UserPrompt: prompt
          };

          const response = await fetch('https://athena.assyst.net/api/suggest_catalog_stream/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          // If the body isn't a stream, fall back to full text
          if (!response.body) {
            const text = await response.text();
            if (!cancelled) observer.next(text);
            if (!cancelled) observer.complete();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let aggregate = '';

          while (!cancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            aggregate += decoder.decode(value, { stream: true });
            if (!cancelled) observer.next(aggregate);
          }

          if (!cancelled) observer.complete();
        } catch (err) {
          if (!cancelled) observer.error(err);
        }
      };

      go();

      return () => {
        cancelled = true;
      };
    });
  }

  // Alternative method using HttpClient (if needed for non-streaming requests)
  sendMessage(prompt: string): Observable<any> {
    const requestBody: ChatRequest = {
      SessionID: this.sessionId,
      UserPrompt: prompt
    };

      return this.http.post('https://athena.assyst.net/api/suggest_catalog_stream', requestBody);
  }
}
