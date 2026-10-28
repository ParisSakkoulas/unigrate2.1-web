import { ToastService } from '../../core/toast.service';
import { Password } from 'primeng/password';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { apiErrorCode, apiErrorKey, FIELD_ERRORS } from '../../core/api-error';
import { User } from '../../core/models';
import { setServerError, validateOrReset } from '../../shared/form-utils';
import { ProfileFieldsComponent } from '../../shared/profile-fields.component';
import { AlertComponent } from '../../shared/ui/alert.component';
import { ButtonDirective } from 'primeng/button';
import { FieldComponent } from '../../shared/ui/field.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { createUserForm, toUserPayload } from '../../shared/user-form';
import { UsersApi } from './users-api.service';

/** Create (no `user` input) or edit (with `user`) a user */
@Component({
  selector: 'app-user-form-modal',
  imports: [Password, InputText, Select, ReactiveFormsModule, TranslatePipe, AlertComponent, ButtonDirective, FieldComponent, ModalComponent, ProfileFieldsComponent],
  template: `
    <ui-modal [title]="user() ? 'admin.editUser' : 'admin.newUser'" (closed)="closed.emit()">
      @if (errorKey(); as key) {
        <ui-alert kind="error">{{ key | translate }}</ui-alert>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="user.role" inputId="role" [control]="form.controls.role" [required]="true">
          <p-select inputId="role" formControlName="role" [options]="roles" styleClass="w-full">
            <ng-template #selectedItem let-o>{{ 'roles.' + o | translate }}</ng-template>
            <ng-template #item let-o>{{ 'roles.' + o | translate }}</ng-template>
          </p-select>
        </ui-field>
        <ui-field label="user.login" help="user.loginHelp" inputId="login"
                  [control]="form.controls.login" [required]="true">
          <input id="login" pInputText class="w-full" formControlName="login" />
        </ui-field>
        <app-profile-fields [form]="form" />
        <ui-field label="user.password" [help]="user() ? 'admin.passwordKeep' : 'user.passwordHelp'"
                  inputId="password" [control]="form.controls.password" [required]="!user()">
          <p-password inputId="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" formControlName="password" autocomplete="new-password" />
        </ui-field>

        <div class="mt-2 flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="closed.emit()">
            {{ 'common.cancel' | translate }}
          </button>
          <button pButton type="submit" [loading]="loading()">{{ 'common.save' | translate }}</button>
        </div>
      </form>
    </ui-modal>
  `,
})
export class UserFormModalComponent implements OnInit {
  private readonly toast = inject(ToastService);
  readonly user = input<User | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(UsersApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly roles = ['STUDENT', 'TEACHER', 'ADMIN'];
  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly form = createUserForm(this.fb);

  ngOnInit(): void {
    const u = this.user();
    if (!u) return;
    // The role of an existing user cannot change; the password stays unless re-entered
    this.form.controls.role.disable();
    this.form.controls.password.setValidators([Validators.minLength(8), Validators.maxLength(72)]);
    this.form.patchValue({
      login: u.login,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      rank: u.rank ?? '',
      admissionYear: u.admissionYear ?? null,
    });
  }

  protected submit(): void {
    this.errorKey.set(null);
    if (!validateOrReset(this.form)) return;

    const u = this.user();
    const body = toUserPayload(this.form, !u);
    this.loading.set(true);
    (u ? this.api.update(u.id, body) : this.api.create(body)).subscribe({
      next: () => {
        this.toast.success(u ? 'userUpdated' : 'userCreated');
        this.saved.emit();
      },
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
