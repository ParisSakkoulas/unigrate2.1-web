import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }
  create(body: object): Observable<User> {
    return this.http.post<User>(this.base, body);
  }
  update(id: string, body: object): Observable<User> {
    return this.http.patch<User>(`${this.base}/${id}`, body);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  approve(id: string): Observable<User> {
    return this.http.post<User>(`${this.base}/${id}/approve`, {});
  }
  reject(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reject`, {});
  }
}
