import { Component, ViewChild, ElementRef, AfterViewChecked, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface ChatMessage {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}

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
  styleUrl: './chat.scss'
})
export class Chat implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  messages = signal<ChatMessage[]>([
    {
      content: 'Hello! I\'m Ask Me, your AI assistant. How can I help you today?',
      isUser: false
    }
  ]);
  
  currentMessage = signal('');
  isTyping = signal(false);
  
  canSend = computed(() => this.currentMessage().trim().length > 0 && !this.isTyping());

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendMessage() {
    if (!this.currentMessage().trim() || this.isTyping()) return;

    // Add user message
    this.messages.update(previousMessages => ([
      ...previousMessages,
      {
        content: this.currentMessage(),
        isUser: true
      }
    ]));

    const userMessage = this.currentMessage();
    this.currentMessage.set('');
    this.isTyping.set(true);

    // Simulate API delay and then start streaming response
    setTimeout(() => {
      this.simulateStreamingResponse(userMessage);
    }, 1000);
  }

  private simulateStreamingResponse(userMessage: string) {
    this.isTyping.set(false);
    
    // Sample responses based on user input
    const responses = [
      "That's a great question! Let me break it down for you step by step. First, we need to consider the context of your inquiry.",
      "I understand what you're asking about. Here's my perspective on this topic, and I'll explain it in detail.",
      "Excellent point! This is something I can definitely help you with. Let me provide you with a comprehensive answer.",
      "Thanks for asking! This is an interesting topic that has several important aspects to consider.",
      "I'd be happy to help you with that! Here's what I think about your question and some additional insights."
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Create streaming message and capture its index in the list
    let streamingIndex = -1;
    this.messages.update(previousMessages => {
      streamingIndex = previousMessages.length;
      return [
        ...previousMessages,
        {
          content: '',
          isUser: false,
          isStreaming: true
        }
      ];
    });
    
    // Simulate streaming by adding characters over time
    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < response.length) {
        const nextChar = response[currentIndex];
        currentIndex++;
        this.messages.update(previousMessages => {
          const nextMessages = [...previousMessages];
          const current = { ...nextMessages[streamingIndex] } as ChatMessage;
          current.content = current.content + nextChar;
          nextMessages[streamingIndex] = current;
          return nextMessages;
        });
      } else {
        clearInterval(streamInterval);
        this.messages.update(previousMessages => {
          const nextMessages = [...previousMessages];
          const current = { ...nextMessages[streamingIndex] } as ChatMessage;
          current.isStreaming = false;
          nextMessages[streamingIndex] = current;
          return nextMessages;
        });
      }
    }, 25); // Add character every 50ms
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
