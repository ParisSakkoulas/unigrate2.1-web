import { ToastService } from '../../core/toast.service';
import { Password } from 'primeng/password';
import { InputText } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { apiErrorCode, apiErrorKey, FIELD_ERRORS } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { User } from '../../core/models';
import { NAME_PATTERN, setServerError, validateOrReset } from '../../shared/form-utils';
import { AlertComponent } from '../../shared/ui/alert.component';
import { ButtonDirective } from 'primeng/button';
import { CardComponent } from '../../shared/ui/card.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';

@Component({
  selector: 'app-profile',
  imports: [Password, InputText, ReactiveFormsModule, TranslatePipe, AlertComponent, ButtonDirective, CardComponent, FieldComponent, SpinnerComponent],
  template: `
    <h1 class="mb-4 text-2xl font-bold">{{ 'profile.title' | translate }}</h1>

    @if (!profile()) {
      <ui-spinner />
    } @else {
      <div class="grid gap-6 md:grid-cols-2">
        <ui-card title="profile.account">
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt class="text-slate-500">{{ 'user.login' | translate }}</dt>
            <dd>{{ profile()!.login }}</dd>
            <dt class="text-slate-500">{{ 'user.role' | translate }}</dt>
            <dd>{{ 'roles.' + profile()!.role | translate }}</dd>
            @if (profile()!.rank) {
              <dt class="text-slate-500">{{ 'user.rank' | translate }}</dt>
              <dd>{{ 'ranks.' + profile()!.rank | translate }}</dd>
            }
            @if (profile()!.studentNumber) {
              <dt class="text-slate-500">{{ 'user.studentNumber' | translate }}</dt>
              <dd>{{ profile()!.studentNumber }}</dd>
              <dt class="text-slate-500">{{ 'user.admissionYear' | translate }}</dt>
              <dd>{{ profile()!.admissionYear }}</dd>
            }
          </dl>
        </ui-card>

        <ui-card title="profile.edit">
          @if (saved()) {
            <ui-alert kind="success">{{ 'profile.saved' | translate }}</ui-alert>
          }
          @if (errorKey(); as key) {
            <ui-alert kind="error">{{ key | translate }}</ui-alert>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <ui-field label="user.firstName" help="user.firstNameHelp" inputId="firstName"
                      [control]="form.controls.firstName" [required]="true">
              <input id="firstName" pInputText class="w-full" formControlName="firstName" />
            </ui-field>
            <ui-field label="user.lastName" help="user.lastNameHelp" inputId="lastName"
                      [control]="form.controls.lastName" [required]="true">
              <input id="lastName" pInputText class="w-full" formControlName="lastName" />
            </ui-field>

            <h3 class="mb-2 mt-6 text-sm font-semibold">{{ 'profile.changePassword' | translate }}</h3>
            <ui-field label="profile.currentPassword" inputId="currentPassword"
                      [control]="form.controls.currentPassword">
              <p-password inputId="currentPassword" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" formControlName="currentPassword" autocomplete="current-password" />
            </ui-field>
            <ui-field label="profile.newPassword" help="profile.newPasswordHelp" inputId="newPassword"
                      [control]="form.controls.newPassword">
              <p-password inputId="newPassword" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" formControlName="newPassword" autocomplete="new-password" />
            </ui-field>

            <button pButton type="submit" [loading]="loading()">{{ 'common.save' | translate }}</button>
          </form>
        </ui-card>
      </div>
    }
  `,
})
export class ProfileComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly profile = signal<User | null>(null);
  protected readonly loading = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
    lastName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
    currentPassword: ['', [Validators.maxLength(72)]],
    newPassword: ['', [Validators.minLength(8), Validators.maxLength(72)]],
  });

  ngOnInit(): void {
    this.http.get<User>(`${environment.apiUrl}/profile`).subscribe({
      next: (u) => this.show(u),
      error: (err: unknown) => this.errorKey.set(apiErrorKey(err)),
    });
  }

  protected submit(): void {
    this.saved.set(false);
    this.errorKey.set(null);
    if (!validateOrReset(this.form)) return;

    const v = this.form.getRawValue();
    // The current password is only needed (and sent) when a new one is chosen
    if (v.newPassword && !v.currentPassword) {
      setServerError(this.form.controls.currentPassword, 'form.required');
      return;
    }
    const body = {
      firstName: v.firstName,
      lastName: v.lastName,
      ...(v.newPassword ? { currentPassword: v.currentPassword, newPassword: v.newPassword } : {}),
    };

    this.loading.set(true);
    this.http.patch<User>(`${environment.apiUrl}/profile`, body).subscribe({
      next: (u) => {
        this.loading.set(false);
        this.show(u);
        this.auth.updateUser(u);
        this.saved.set(true);
        this.toast.success('profileUpdated');
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

  private show(u: User): void {
    this.profile.set(u);
    this.form.reset({ firstName: u.firstName, lastName: u.lastName, currentPassword: '', newPassword: '' });
  }
}
