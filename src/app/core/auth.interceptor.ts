import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { DepartmentService } from './department.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const department = inject(DepartmentService).selectedId();
  const isApi = req.url.startsWith(environment.apiUrl);

  // Token for the API, plus the department the user is looking at
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (department) headers['X-Department'] = department;
  const authReq = isApi ? req.clone({ setHeaders: headers }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      // A 401 on a protected call means the token expired or the account was removed
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        token &&
        !req.url.endsWith('/auth/login')
      ) {
        auth.logout('expired');
      }
      return throwError(() => err);
    }),
  );
};
