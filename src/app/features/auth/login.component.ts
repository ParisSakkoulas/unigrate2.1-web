import { Password } from 'primeng/password';
import { InputText } from 'primeng/inputtext';
import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { apiErrorKey } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { validateOrReset } from '../../shared/form-utils';
import { AlertComponent } from '../../shared/ui/alert.component';
import { ButtonDirective } from 'primeng/button';
import { CardComponent } from '../../shared/ui/card.component';
import { FieldComponent } from '../../shared/ui/field.component';

@Component({
  selector: 'app-login',
  imports: [Password, InputText, ReactiveFormsModule, RouterLink, TranslatePipe, AlertComponent, ButtonDirective, CardComponent, FieldComponent],
  template: `
    <div class="mx-auto max-w-md">
      <ui-card title="login.title">
        @if (reason() === 'expired') {
          <ui-alert kind="warning">{{ 'login.expired' | translate }}</ui-alert>
        }
        @if (errorKey(); as key) {
          <ui-alert kind="error">{{ key | translate }}</ui-alert>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <ui-field label="user.login" help="login.loginHelp" inputId="login"
                    [control]="form.controls.login" [required]="true">
            <input id="login" pInputText class="w-full" formControlName="login" autocomplete="username"
                   [placeholder]="'user.loginPlaceholder' | translate" />
          </ui-field>
          <ui-field label="user.password" inputId="password"
                    [control]="form.controls.password" [required]="true">
            <p-password inputId="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" formControlName="password" autocomplete="current-password" />
          </ui-field>
          <button pButton type="submit" class="w-full" [loading]="loading()">
            {{ 'nav.login' | translate }}
          </button>
        </form>

        <p class="mt-4 text-sm">
          {{ 'login.noAccount' | translate }}
          <a routerLink="/register" class="app-link">{{ 'nav.register' | translate }}</a>
        </p>
      </ui-card>
    </div>
  `,
})
export class LoginComponent {
  // Bound from the query string (withComponentInputBinding)
  readonly reason = input<string>();
  readonly returnUrl = input<string>();

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.fb.group({
    login: ['', [Validators.required, Validators.maxLength(32)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  protected submit(): void {
    this.errorKey.set(null);
    if (!validateOrReset(this.form)) return;

    const { login, password } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.login(login, password).subscribe({
      next: () => void this.router.navigateByUrl(this.safeReturnUrl()),
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorKey.set(apiErrorKey(err));
        this.form.controls.password.reset('');
      },
    });
  }

  // Only allow in-app paths (prevents open redirects)
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
