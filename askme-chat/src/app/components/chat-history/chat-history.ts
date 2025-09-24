import { Component, EventEmitter, Output, Input, signal, inject, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ChatStorageService } from '../../services/chat-storage.service';
import { ChatSession } from '../../models/chat-storage.models';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-rename-dialog',
  template: `
    <h2 mat-dialog-title>Rename Chat</h2>
    <mat-dialog-content>
      <mat-form-field class="w-full">
        <mat-label>Chat Name</mat-label>
        <input matInput [(ngModel)]="data.name" (keyup.enter)="onSave()">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-button [mat-dialog-close]="data.name" cdkFocusInitial (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule],
  standalone: true
})
export class RenameDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { name: string }) {}

  onSave() {
    // The dialog result is handled by mat-dialog-close
  }
}

@Component({
  selector: 'app-chat-history',
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './chat-history.html',
  styleUrl: './chat-history.scss'
})
export class ChatHistory implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newChatRequested = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();
  private chatStorageService = inject(ChatStorageService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  sessions = signal<ChatSession[]>([]);

  ngOnInit() {
    this.chatStorageService.getSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(sessions => {
        this.sessions.set(sessions);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSessionClick(sessionId: string) {
    this.sessionSelected.emit(sessionId);
  }

  onNewChat() {
    this.newChatRequested.emit();
  }

  async onRenameSession(session: ChatSession, event: Event) {
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(RenameDialogComponent, {
      width: '300px',
      data: { name: session.name }
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result && result.trim() && result !== session.name) {
      try {
        await this.chatStorageService.updateSessionName(session.id, result.trim());
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
  }

  async onDeleteSession(session: ChatSession, event: Event) {
    event.stopPropagation();
    
    if (confirm(`Are you sure you want to delete "${session.name}"?`)) {
      try {
        await this.chatStorageService.deleteSession(session.id);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  }

  async onClearAllSessions() {
    if (confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
      try {
        await this.chatStorageService.clearAllSessions();
      } catch (error) {
        console.error('Failed to clear all sessions:', error);
      }
    }
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  truncateMessage(message: string | undefined, maxLength: number = 50): string {
    if (!message) return 'No messages yet';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  }

  onMenuToggle() {
    this.menuToggle.emit();
  }

  onToggleCollapse() {
    this.toggleCollapse.emit();
  }
}