import { Component, ViewChild, ElementRef, AfterViewChecked, signal, computed, inject, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ChatService, ChatMessage, StreamResponse } from '../../services/chat.service';

@Component({
  selector: 'app-chat',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
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
export class Chat implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  private chatService = inject(ChatService);

  messages = signal<ChatMessage[]>([
    {
      id: this.generateId(),
      content: 'Hello! I\'m Ask Me, your AI assistant. How can I help you today?',
      isUser: false
    }
  ]);
  
  currentMessage = signal('');
  isTyping = signal(false);
  
  canSend = computed(() => this.currentMessage().trim().length > 0 && !this.isTyping());

  ngOnInit() {
    // Session ID is now handled by the service
    console.log('Session ID:', this.chatService.getSessionId());
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
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

    // Add user message
    this.messages.update(previousMessages => ([
      ...previousMessages,
      {
        id: this.generateId(),
        content: this.currentMessage(),
        isUser: true
      }
    ]));

    const userMessage = this.currentMessage();
    this.currentMessage.set('');
    this.isTyping.set(true);

    // Start streaming response from API
    this.streamResponse(userMessage);
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

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch(err) {}
  }
}
