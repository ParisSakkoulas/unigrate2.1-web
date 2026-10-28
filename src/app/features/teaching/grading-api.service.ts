import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GradingScheme, ImportReport, TeachingView } from '../../core/models';
import { downloadFile } from '../../core/download';

export type ExportFormat = 'csv' | 'xlsx';

@Injectable({ providedIn: 'root' })
export class GradingApi {
  private readonly http = inject(HttpClient);
  private url(courseId: string, path = ''): string {
    return `${environment.apiUrl}/courses/${courseId}${path}`;
  }

  view(courseId: string): Observable<TeachingView> {
    return this.http.get<TeachingView>(this.url(courseId, '/teaching'));
  }
  setScheme(courseId: string, scheme: GradingScheme): Observable<TeachingView> {
    return this.http.put<TeachingView>(this.url(courseId, '/grading-scheme'), scheme);
  }
  closeRegistrations(courseId: string): Observable<void> {
    return this.http.post<void>(this.url(courseId, '/registrations/close'), {});
  }
  setGrade(courseId: string, registrationId: string, grades: { theoryGrade?: number; labGrade?: number }): Observable<void> {
    return this.http.put<void>(this.url(courseId, `/grades/${registrationId}`), grades);
  }
  importGrades(courseId: string, file: File): Observable<ImportReport> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ImportReport>(this.url(courseId, '/grades/import'), body);
  }
  finalizeGrades(courseId: string): Observable<void> {
    return this.http.post<void>(this.url(courseId, '/grades/finalize'), {});
  }
  endSemester(courseId: string): Observable<void> {
    return this.http.post<void>(this.url(courseId, '/end-semester'), {});
  }
  exportGrades(courseId: string, format: ExportFormat, name: string) {
    return downloadFile(this.http, this.url(courseId, `/grades/export?format=${format}`), `${name}-grades.${format}`);
  }
  exportStudents(courseId: string, format: ExportFormat, name: string) {
    return downloadFile(this.http, this.url(courseId, `/registrations/export?format=${format}`), `${name}-students.${format}`);
  }
}
