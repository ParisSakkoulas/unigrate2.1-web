import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/** Downloads an authenticated file (the token is added by the interceptor) and saves it */
export function downloadFile(http: HttpClient, url: string, filename: string): Observable<Blob> {
  return http.get(url, { responseType: 'blob' }).pipe(
    tap((blob) => {
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
    }),
  );
}
