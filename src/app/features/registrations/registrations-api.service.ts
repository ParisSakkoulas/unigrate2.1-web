import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AvailableCourse, MyRegistration } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class RegistrationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/registrations`;

  available(): Observable<AvailableCourse[]> {
    return this.http.get<AvailableCourse[]>(`${this.base}/available`);
  }
  mine(): Observable<MyRegistration[]> {
    return this.http.get<MyRegistration[]>(`${this.base}/me`);
  }
  register(courseId: string): Observable<void> {
    return this.http.post<void>(this.base, { courseId });
  }
  unregister(courseId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${courseId}`);
  }
  finalize(courseId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${courseId}/finalize`, {});
  }
}
