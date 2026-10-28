import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course, CourseState, TeacherSummary } from '../../core/models';

export interface CourseBody {
  name?: string;
  description?: string;
  prerequisites?: string[];
}

@Injectable({ providedIn: 'root' })
export class CoursesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/courses`;

  search(q?: string, state?: CourseState | ''): Observable<Course[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (state) params = params.set('state', state);
    return this.http.get<Course[]>(this.base, { params });
  }
  get(id: string): Observable<Course> {
    return this.http.get<Course>(`${this.base}/${id}`);
  }
  create(body: CourseBody): Observable<Course> {
    return this.http.post<Course>(this.base, body);
  }
  update(id: string, body: CourseBody): Observable<Course> {
    return this.http.patch<Course>(`${this.base}/${id}`, body);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  assign(id: string, teacherId: string): Observable<Course> {
    return this.http.post<Course>(`${this.base}/${id}/assign`, { teacherId });
  }
  teachers(): Observable<TeacherSummary[]> {
    return this.http.get<TeacherSummary[]>(`${environment.apiUrl}/teachers`);
  }
}
