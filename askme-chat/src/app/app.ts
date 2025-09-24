import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { ChatHistory } from './components/chat-history/chat-history';
import { SessionManagerService } from './services/session-manager.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, ChatHistory],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Athena';
  
  private sessionManager = inject(SessionManagerService);
  
  sidenavCollapsed = signal(false);
  
  onToggleSidenav() {
    // This can be used to show/hide the sidebar if needed
    // For now, we'll keep it for compatibility
  }

  onToggleCollapse() {
    this.sidenavCollapsed.update(collapsed => !collapsed);
  }

  onSessionSelected(sessionId: string) {
    this.sessionManager.loadSession(sessionId);
  }

  onNewChatRequested() {
    this.sessionManager.startNewChat();
  }
}
