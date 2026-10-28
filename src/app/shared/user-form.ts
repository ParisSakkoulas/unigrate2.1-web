import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Role, TeacherRank } from '../core/models';
import { LOGIN_PATTERN, NAME_PATTERN } from './form-utils';

export const MIN_YEAR = 1990;
export const maxYear = () => new Date().getFullYear() + 1;

/** Form used by registration and by the admin create/edit dialog */
export function createUserForm(fb: NonNullableFormBuilder) {
  return fb.group({
    login: ['', [Validators.required, Validators.pattern(LOGIN_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    role: ['STUDENT' as Role, Validators.required],
    firstName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
    lastName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
    rank: ['' as TeacherRank | ''],
    admissionYear: [null as number | null],
  });
}

export type UserForm = ReturnType<typeof createUserForm>;

/** Teacher fields are required for TEACHER, student fields for STUDENT, nothing for ADMIN */
export function syncRoleValidators(form: UserForm): void {
  const { role, rank, admissionYear } = form.controls;
  const isTeacher = role.value === 'TEACHER';
  const isStudent = role.value === 'STUDENT';

  rank.setValidators(isTeacher ? [Validators.required] : []);
  admissionYear.setValidators(
    isStudent ? [Validators.required, Validators.min(MIN_YEAR), Validators.max(maxYear())] : [],
  );
  for (const c of [rank, admissionYear]) c.updateValueAndValidity({ emitEvent: false });
}

/** Request body with only the fields that belong to the chosen role */
export function toUserPayload(form: UserForm, includeRole: boolean) {
  const v = form.getRawValue();
  return {
    login: v.login,
    ...(v.password ? { password: v.password } : {}),
    ...(includeRole ? { role: v.role } : {}),
    firstName: v.firstName,
    lastName: v.lastName,
    ...(v.role === 'TEACHER' ? { rank: v.rank } : {}),
    ...(v.role === 'STUDENT'
      ? { admissionYear: Number(v.admissionYear) }
      : {}),
  };
}
