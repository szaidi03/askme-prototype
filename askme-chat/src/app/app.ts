import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { MenuBar } from './components/menu-bar/menu-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, MenuBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Ask Me';
}
