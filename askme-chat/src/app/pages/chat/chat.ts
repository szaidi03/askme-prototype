import { Component, ViewChild, ElementRef, AfterViewChecked, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ChatMessage, StreamResponse } from '../../services/chat.service';
import { ChatStorageService } from '../../services/chat-storage.service';
import { SessionManagerService } from '../../services/session-manager.service';
import { StoredChatMessage, StoredChatSession } from '../../models/chat-storage.models';

@Component({
  selector: 'app-chat',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  animations: [
    trigger('msgFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(4px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class Chat implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  private chatService = inject(ChatService);
  private chatStorageService = inject(ChatStorageService);
  private sessionManager = inject(SessionManagerService);
  private sanitizer = inject(DomSanitizer);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  messages = signal<ChatMessage[]>([
    {
      id: this.generateId(),
      content: 'Hello! I\'m Ask Me, your AI assistant. How can I help you today?',
      isUser: false
    }
  ]);
  
  // Track animation version for forcing re-animations
  animationVersion = signal(0);
  
  currentMessage = signal('');
  isTyping = signal(false);
  
  // Current session management
  currentSessionId = signal<string | null>(null);
  isSessionSaved = signal(false);
  
  // Preset questions
  presetQuestions = signal([
    'Do you have security group configurations for ec2 instances?',
    'I need to know what systems utilize PII information.',
    'Where to find team members data in netsparker?',
    'Where can I locate critical and high vulnerabilities?'
  ]);
  
  canSend = computed(() => this.currentMessage().trim().length > 0 && !this.isTyping());
  
  // Show preset questions when there are no user messages (only the initial greeting)
  showPresetQuestions = computed(() => {
    const userMessages = this.messages().filter(msg => msg.isUser);
    return userMessages.length === 0;
  });

  ngOnInit() {
    // Session ID is now handled by the service
    console.log('Session ID:', this.chatService.getSessionId());
    
    // Listen for session changes from the app component
    this.sessionManager.sessionEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event) {
          if (event.type === 'load' && event.sessionId) {
            this.loadSession(event.sessionId);
          } else if (event.type === 'new') {
            this.startNewChat();
          }
        }
      });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  sendMessage() {
    if (!this.currentMessage().trim() || this.isTyping()) return;

    const userMessage = this.currentMessage();
    this.currentMessage.set('');

    // Add user message
    this.messages.update(previousMessages => ([
      ...previousMessages,
      {
        id: this.generateId(),
        content: userMessage,
        isUser: true
      }
    ]));

    // IMPORTANT: Save the user message immediately
    this.saveUserMessage(userMessage);

    this.isTyping.set(true);

    // Start streaming response from API
    this.streamResponse(userMessage);
  }

  // New method to save user messages immediately
  private async saveUserMessage(content: string) {
    try {
      const message: StoredChatMessage = {
        id: this.generateId(),
        content: content,
        isUser: true,
        timestamp: Date.now()
      };

      let sessionId = this.currentSessionId();
      
      if (!sessionId) {
        // Create new session with the current API session ID
        const name = `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        const currentApiSessionId = this.chatService.getSessionId();
        sessionId = await this.chatStorageService.createSession(name, [message], currentApiSessionId);
        this.currentSessionId.set(sessionId);
        this.isSessionSaved.set(true);
        console.log('Created new session with user message, API session ID:', currentApiSessionId);
      } else {
        // Save message to existing session
        await this.chatStorageService.saveMessage(sessionId, message);
        console.log('Saved user message to existing session:', sessionId);
      }
    } catch (error) {
      console.error('Failed to save user message:', error);
    }
  }

  // New method to save AI responses when streaming is complete
  private async saveAIResponse(content: string) {
    try {
      const message: StoredChatMessage = {
        id: this.generateId(),
        content: content,
        isUser: false,
        timestamp: Date.now()
      };

      const sessionId = this.currentSessionId();
      if (sessionId) {
        await this.chatStorageService.saveMessage(sessionId, message);
        console.log('Saved AI response to session:', sessionId);
      }
    } catch (error) {
      console.error('Failed to save AI response:', error);
    }
  }

  private async streamResponse(userMessage: string) {
    let streamingIndex = -1;
    
    try {
      // Create streaming message
      this.messages.update(previousMessages => {
        streamingIndex = previousMessages.length;
        return [
          ...previousMessages,
          {
            id: this.generateId(),
            content: '',
            isUser: false,
            isStreaming: true
          }
        ];
      });

      // Progressive updates using observable stream of chunks/aggregate text
      await new Promise<void>((resolve, reject) => {
        const sub = this.chatService.streamResponse$(userMessage).subscribe({
          next: (aggregate: string) => {
            this.messages.update(previousMessages => {
              const nextMessages = [...previousMessages];
              const current = { ...nextMessages[streamingIndex] } as ChatMessage;
              current.content = aggregate;
              nextMessages[streamingIndex] = current;
              return nextMessages;
            });
          },
          error: (err: any) => {
            sub.unsubscribe();
            reject(err);
          },
          complete: () => {
            sub.unsubscribe();
            resolve();
          }
        });
      });

      this.finishStreaming(streamingIndex);
      
      // Save the AI response when streaming is complete
      const aiResponse = this.messages()[streamingIndex].content;
      await this.saveAIResponse(aiResponse);

    } catch (error: any) {
      console.error('Streaming error:', error);
      this.handleStreamingError(streamingIndex, error);
    } finally {
      this.isTyping.set(false);
    }
  }

  private finishStreaming(streamingIndex: number) {
    this.messages.update(previousMessages => {
      const nextMessages = [...previousMessages];
      const current = { ...nextMessages[streamingIndex] } as ChatMessage;
      current.isStreaming = false;
      nextMessages[streamingIndex] = current;
      return nextMessages;
    });
  }

  private handleStreamingError(streamingIndex: number, error: any) {
    this.messages.update(previousMessages => {
      const nextMessages = [...previousMessages];
      const current = { ...nextMessages[streamingIndex] } as ChatMessage;
      current.isStreaming = false;
      current.error = true;
      current.content = `Sorry, I encountered an error: ${error.message || 'Unknown error'}`;
      nextMessages[streamingIndex] = current;
      return nextMessages;
    });
  }

  onEnterPress(pEvent: Event) {
    const event = pEvent as KeyboardEvent;
    if (event.key === 'Enter' && !event.shiftKey) {
      console.log('Enter pressed');
      event.preventDefault();
      
      this.sendMessage();
    }
  }

  onPresetQuestionClick(question: string) {
    // Set the question as the current message and send it
    this.currentMessage.set(question);
    this.sendMessage();
  }

  async saveCurrentSession(sessionName?: string) {
    const messages = this.messages();
    const userMessages = messages.filter(msg => msg.isUser);
    
    // Don't save sessions with only the greeting message
    if (userMessages.length === 0) {
      return;
    }

    try {
      const storedMessages: StoredChatMessage[] = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: Date.now(),
        isStreaming: msg.isStreaming,
        error: msg.error
      }));

      let sessionId = this.currentSessionId();
      
              if (!sessionId) {
          // Create new session with the current API session ID
          const name = sessionName || `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
          const currentApiSessionId = this.chatService.getSessionId();
          sessionId = await this.chatStorageService.createSession(name, storedMessages, currentApiSessionId);
          this.currentSessionId.set(sessionId);
          console.log('Created new session with API session ID:', currentApiSessionId);
      } else {
        // Update existing session by saving the latest message
        const lastMessage = storedMessages[storedMessages.length - 1];
        if (lastMessage) {
          await this.chatStorageService.saveMessage(sessionId, lastMessage);
        }
      }
      
      this.isSessionSaved.set(true);
      console.log('Session saved:', sessionId);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  async loadSession(sessionId: string) {
    try {
      const session = await this.chatStorageService.getSession(sessionId);
      if (session) {
        const chatMessages: ChatMessage[] = session.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.isUser,
          isStreaming: msg.isStreaming,
          error: msg.error
        }));

        this.messages.set(chatMessages);
        this.currentSessionId.set(sessionId);
        this.isSessionSaved.set(true);
        
        // IMPORTANT: Restore the API session ID from the loaded session
        // This ensures API calls use the same session ID as the original conversation
        if (session.apiSessionId) {
          this.chatService.restoreSessionId(session.apiSessionId);
          console.log('Restored API session ID for conversation continuity:', session.apiSessionId);
        } else {
          console.warn('No API session ID found in loaded session, generating new one');
          this.chatService.generateNewSessionId();
        }
        
        console.log('Session loaded:', sessionId);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }

  startNewChat() {
    this.messages.set([
      {
        id: this.generateId(),
        content: 'Hello! I\'m Ask Me, your AI assistant. How can I help you today?',
        isUser: false
      }
    ]);
    this.currentSessionId.set(null);
    this.isSessionSaved.set(false);
    this.currentMessage.set('');
    
    // Generate a new API session ID for the fresh chat
    this.chatService.generateNewSessionId();
    
    console.log('New chat started with fresh API session ID:', this.chatService.getSessionId());
  }

  // Debug method to help verify session ID synchronization
  debugSessionInfo(): void {
    console.log('=== Chat Component Session Debug ===');
    console.log('Local Storage Session ID:', this.currentSessionId());
    console.log('API Session ID:', this.chatService.getSessionId());
    console.log('Session Saved:', this.isSessionSaved());
    console.log('===============================');
  }

  // Debug method to show current message status
  debugMessageStatus(): void {
    console.log('=== Message Status Debug ===');
    console.log('Total Messages:', this.messages().length);
    console.log('User Messages:', this.messages().filter(msg => msg.isUser).length);
    console.log('AI Messages:', this.messages().filter(msg => !msg.isUser).length);
    console.log('Current Session ID:', this.currentSessionId());
    console.log('Session Saved:', this.isSessionSaved());
    console.log('==========================');
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch(err) {}
  }

  parseMarkdown(text: string): SafeHtml {
    if (!text) return '';
    
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto my-2"><code>$1</code></pre>')
      
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      
      // Line breaks
      .replace(/\n/g, '<br>')
      
      // Wrap lists
      .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc">$1</ul>')
      .replace(/<ul class="list-disc">(<li.*<\/li>)<\/ul>/gs, '<ul class="list-disc">$1</ul>')
      
      // Clean up multiple line breaks
      .replace(/<br><br>/g, '</p><p>')
      
      // Wrap in paragraphs
      .replace(/^(.+)$/gm, '<p>$1</p>')
      
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p><br><\/p>/g, '')
      
      // Final cleanup
      .replace(/<p>(<h[1-6].*<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p>(<ul.*<\/ul>)<\/p>/g, '$1')
      .replace(/<p>(<pre.*<\/pre>)<\/p>/g, '$1');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
