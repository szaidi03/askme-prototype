import { Component, EventEmitter, OnInit, Output, signal, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbarModule, 
    MatIconModule, 
    MatButtonModule, 
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    CommonModule,
    FormsModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();

  private databaseService = inject(DatabaseService);
  private router = inject(Router);
  databases = signal<string[]>([]);
  selectedDatabase = signal<string>('');
  isLoading = signal(false);

  ngOnInit() {
    this.loadDatabases();
  }

  private loadDatabases() {
    this.isLoading.set(true);
    this.databaseService.getDatabaseList().subscribe({
      next: (response) => {
        this.databases.set(response.database_list);
        // if (response.database_list.length > 0) {
        //   this.selectedDatabase.set(response.database_list[0]);
        // }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading databases:', error);
        this.isLoading.set(false);
      }
    });
  }

  onDatabaseChange(database: string) {
    this.selectedDatabase.set(database);
    console.log('Selected database:', database);
  }

  onMenuToggle() {
    this.menuToggle.emit();
  }

  onToggleCollapse() {
    this.toggleCollapse.emit();
  }

  resetChat() {
    window.location.reload();
  }
}
