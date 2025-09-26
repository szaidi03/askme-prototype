import { Routes } from '@angular/router';
import { Chat } from './pages/chat/chat';
import { HelpDesk } from './pages/helpdesk/helpdesk';

export const routes: Routes = [
  { path: '', redirectTo: '/helpdesk', pathMatch: 'full' },
  { path: 'helpdesk', component: HelpDesk },
  { path: 'chat', component: Chat },
  { path: '**', redirectTo: '/helpdesk' }
];
