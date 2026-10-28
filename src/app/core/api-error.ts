import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

const KNOWN_CODES = new Set([
  'INVALID_CREDENTIALS',
  'ACCOUNT_PENDING',
  'LOGIN_TAKEN',
  'STUDENT_NUMBER_TAKEN',
  'ADMIN_EXISTS',
  'CANNOT_DELETE_ADMIN',
  'NOT_PENDING',
  'USER_NOT_FOUND',
  'WRONG_PASSWORD',
  'FIELD_NOT_ALLOWED',
  'FORBIDDEN_ROLE',
  'VALIDATION_FAILED',
  'INVALID_ID',
  'INVALID_TRANSITION',
  'COURSE_NOT_FOUND',
  'COURSE_NAME_TAKEN',
  'COURSE_IS_PREREQUISITE',
  'COURSE_HAS_HISTORY',
  'TEACHING_EXISTS',
  'TEACHER_NOT_FOUND',
  'PREREQUISITE_CYCLE',
  'PREREQUISITE_NOT_FOUND',
  'WEIGHTS_SUM',
  'NO_REGISTRATIONS',
  'GRADES_INCOMPLETE',
  'NOT_COURSE_TEACHER',
  'TEACHING_NOT_FOUND',
  'REGISTRATION_NOT_FOUND',
  'REGISTRATION_FINALIZED',
  'ALREADY_REGISTERED',
  'ALREADY_PASSED',
  'PREREQUISITES_NOT_PASSED',
  'NOT_A_STUDENT',
  'NO_GRADES',
  'NO_FILE',
  'UNSUPPORTED_FILE',
  'UNREADABLE_FILE',
  'TOO_MANY_ROWS',
  'PAYLOAD_TOO_LARGE',
  'NO_PROFILE',
  'DEPARTMENT_REQUIRED',
  'DEPARTMENT_MISMATCH',
  'DEPARTMENT_NOT_FOUND',
  'UNIVERSITY_NOT_FOUND',
  'UNIVERSITY_NAME_TAKEN',
  'DEPARTMENT_NAME_TAKEN',
  'DEPARTMENT_CODE_TAKEN',
  'UNIVERSITY_NOT_EMPTY',
  'DEPARTMENT_NOT_EMPTY',
]);

/** Translation key for an HTTP error from the API */
export function apiErrorKey(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'errors.NETWORK';
    const code = (err.error as ApiError | null)?.code;
    if (code && KNOWN_CODES.has(code)) return `errors.${code}`;
  }
  return 'errors.UNKNOWN';
}

/** Backend error codes that belong to a specific form field */
export const FIELD_ERRORS: Record<string, string> = {
  LOGIN_TAKEN: 'login',
  WRONG_PASSWORD: 'currentPassword',
  COURSE_NAME_TAKEN: 'name',
  UNIVERSITY_NAME_TAKEN: 'name',
  DEPARTMENT_NAME_TAKEN: 'name',
  DEPARTMENT_CODE_TAKEN: 'code',
};

export function apiErrorCode(err: unknown): string | null {
  return err instanceof HttpErrorResponse ? ((err.error as ApiError | null)?.code ?? null) : null;
}

/** Interpolation values of an API error (e.g. state and event of INVALID_TRANSITION) */
export function apiErrorParams(err: unknown): Record<string, string> {
  if (err instanceof HttpErrorResponse) {
    const params = (err.error as (ApiError & { params?: Record<string, string> }) | null)?.params;
    if (params) return params;
  }
  return {};
}

/** Error ready for display: translation key + interpolation params */
export interface ErrorInfo {
  key: string;
  params: Record<string, string>;
}

export function toErrorInfo(err: unknown): ErrorInfo {
  return { key: apiErrorKey(err), params: apiErrorParams(err) };
}
