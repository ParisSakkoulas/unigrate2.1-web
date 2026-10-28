import { Password } from 'primeng/password';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { DepartmentService } from '../../core/department.service';
import { apiErrorCode, apiErrorKey, FIELD_ERRORS } from '../../core/api-error';
import { setServerError, validateOrReset } from '../../shared/form-utils';
import { ProfileFieldsComponent } from '../../shared/profile-fields.component';
import { AlertComponent } from '../../shared/ui/alert.component';
import { ButtonDirective } from 'primeng/button';
import { CardComponent } from '../../shared/ui/card.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { createUserForm, toUserPayload } from '../../shared/user-form';

@Component({
  selector: 'app-register',
  imports: [Password, InputText, Select, ReactiveFormsModule, RouterLink, TranslatePipe, AlertComponent, ButtonDirective, CardComponent, FieldComponent, ProfileFieldsComponent],
  template: `
    <div class="mx-auto max-w-lg">
      <ui-card title="register.title">
        @if (done()) {
          <ui-alert kind="success">{{ 'register.success' | translate }}</ui-alert>
          <a routerLink="/login" class="app-link text-sm">{{ 'nav.login' | translate }}</a>
        } @else {
          <p class="mb-4 text-sm text-slate-600">{{ 'register.intro' | translate }}</p>
          @if (errorKey(); as key) {
            <ui-alert kind="error">{{ key | translate }}</ui-alert>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <ui-field label="dept.university" inputId="university" [control]="university" [required]="true">
              <p-select inputId="university" [formControl]="university" [options]="departments.universities()"
                        optionLabel="name" optionValue="id" styleClass="w-full"
                        (onChange)="department.reset(null)" />
            </ui-field>
            <ui-field label="dept.department" help="register.departmentHelp" inputId="department"
                      [control]="department" [required]="true">
              <p-select inputId="department" [formControl]="department" [options]="departmentOptions()"
                        optionLabel="name" optionValue="id" styleClass="w-full"
                        [placeholder]="'dept.chooseDepartment' | translate" />
            </ui-field>

            <ui-field label="user.role" help="register.roleHelp" inputId="role"
                      [control]="form.controls.role" [required]="true">
              <p-select inputId="role" formControlName="role" [options]="roleOptions" styleClass="w-full">
                <ng-template #selectedItem let-o>{{ 'roles.' + o | translate }}</ng-template>
                <ng-template #item let-o>{{ 'roles.' + o | translate }}</ng-template>
              </p-select>
            </ui-field>

            <ui-field label="user.login" help="user.loginHelp" inputId="login"
                      [control]="form.controls.login" [required]="true">
              <input id="login" pInputText class="w-full" formControlName="login" autocomplete="username"
                     [placeholder]="'user.loginPlaceholder' | translate" />
            </ui-field>

            <app-profile-fields [form]="form" />

            <ui-field label="user.password" help="user.passwordHelp" inputId="password"
                      [control]="form.controls.password" [required]="true">
              <p-password inputId="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" formControlName="password" autocomplete="new-password" />
            </ui-field>
            <ui-field label="user.confirmPassword" inputId="confirm"
                      [control]="confirm" [required]="true">
              <p-password inputId="confirm" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" [formControl]="confirm" autocomplete="new-password" />
            </ui-field>

            <button pButton type="submit" class="w-full" [loading]="loading()">
              {{ 'register.submit' | translate }}
            </button>
          </form>
        }
      </ui-card>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly roleOptions = ['STUDENT', 'TEACHER'];
  protected readonly departments = inject(DepartmentService);
  // Frontend-only university choice narrows the list; the API receives the department id
  protected readonly university = this.fb.control(this.departments.selected()?.university.id ?? '', Validators.required);
  protected readonly department = new FormControl<string | null>(this.departments.selectedId(), Validators.required);
  private readonly universityId = toSignal(this.university.valueChanges, { initialValue: this.university.value });
  protected readonly departmentOptions = computed(() =>
    this.departments.departments().filter((d) => d.university.id === this.universityId()),
  );
  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = createUserForm(this.fb);
  // Frontend-only field, kept outside the group so the group matches `UserForm`
  protected readonly confirm = this.fb.control('', [
    Validators.required,
    (c: AbstractControl): ValidationErrors | null =>
      c.value === this.form.controls.password.value ? null : { mismatch: true },
  ]);

  constructor() {
    this.form.controls.password.valueChanges.subscribe(() => this.confirm.updateValueAndValidity());
  }

  protected submit(): void {
    this.errorKey.set(null);
    const valid = validateOrReset(this.form);
    this.confirm.markAsTouched();
    this.university.markAsTouched();
    this.department.markAsTouched();
    if (!valid || this.confirm.invalid || this.department.invalid) return;

    this.loading.set(true);
    this.http
      .post(`${environment.apiUrl}/auth/register`, { ...toUserPayload(this.form, true), department: this.department.value })
      .subscribe({
        next: () => this.done.set(true),
        error: (err: unknown) => {
          this.loading.set(false);
          const code = apiErrorCode(err);
          const field = code ? FIELD_ERRORS[code] : undefined;
          const control = field ? this.form.get(field) : null;
          if (control) {
            control.reset('');
            setServerError(control, apiErrorKey(err));
          } else {
            this.errorKey.set(apiErrorKey(err));
          }
        },
      });
  }
}
