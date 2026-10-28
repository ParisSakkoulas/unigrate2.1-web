import { AbstractControl, FormGroup } from '@angular/forms';

/** Unicode letters, spaces, apostrophes and hyphens (mirrors the backend) */
export const NAME_PATTERN = /^[\p{L}][\p{L} '-]*$/u;
export const LOGIN_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
export const STUDENT_NUMBER_PATTERN = /^[0-9A-Za-z]{4,20}$/;

/**
 * Call on submit. Marks everything touched so errors show; when the form is invalid,
 * values that failed validation (but are not empty) are cleared so the user retypes them.
 * Returns true when the form is valid.
 */
export function validateOrReset(form: FormGroup): boolean {
  form.markAllAsTouched();
  if (form.valid) return true;
  for (const control of Object.values(form.controls)) {
    if (control.invalid && control.value !== '' && control.value !== null) {
      control.reset('');
      control.markAsTouched();
    }
  }
  return false;
}

/** Attach a server-side error (translation key) to a control */
export function setServerError(control: AbstractControl, key: string): void {
  control.setErrors({ server: key });
  control.markAsTouched();
}
