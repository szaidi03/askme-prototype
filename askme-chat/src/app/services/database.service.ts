import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DatabaseListResponse {
  database_list: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private http = inject(HttpClient);
  private apiUrl = 'http://10.10.30.185:8000/api/list_database';

  getDatabaseList(): Observable<DatabaseListResponse> {
    return this.http.get<DatabaseListResponse>(this.apiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });
  }
}
