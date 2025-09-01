import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SessionEvent {
  type: 'load' | 'new';
  sessionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionManagerService {
  private sessionEventSubject = new BehaviorSubject<SessionEvent | null>(null);
  
  public sessionEvent$ = this.sessionEventSubject.asObservable();

  loadSession(sessionId: string) {
    this.sessionEventSubject.next({ type: 'load', sessionId });
  }

  startNewChat() {
    this.sessionEventSubject.next({ type: 'new' });
  }
}