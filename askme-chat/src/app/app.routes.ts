import { Routes } from '@angular/router';
import { Chat } from './pages/chat/chat';

export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  { path: 'chat', component: Chat },
  { path: '**', redirectTo: '/chat' }
];
