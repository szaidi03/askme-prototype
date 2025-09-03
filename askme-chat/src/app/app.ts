import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Header } from './components/header/header';
import { ChatHistory } from './components/chat-history/chat-history';
import { SessionManagerService } from './services/session-manager.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, MatSidenavModule, ChatHistory],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Athena';
  
  private sessionManager = inject(SessionManagerService);
  
  sidenavOpened = signal(false);
  
  onToggleSidenav() {
    this.sidenavOpened.update(opened => !opened);
  }

  onCloseSidenav() {
    this.sidenavOpened.set(false);
  }

  onSessionSelected(sessionId: string) {
    this.onCloseSidenav();
    this.sessionManager.loadSession(sessionId);
  }

  onNewChatRequested() {
    this.onCloseSidenav();
    this.sessionManager.startNewChat();
  }
}
