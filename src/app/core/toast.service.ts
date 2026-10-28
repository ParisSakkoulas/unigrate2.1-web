import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

/** Success messages (PrimeNG toast) for create / update / delete etc.; `key` is a `toast.*` translation key */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messages = inject(MessageService);
  private readonly translate = inject(TranslateService);

  success(key: string, params?: Record<string, string>): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('toast.success'),
      detail: this.translate.instant(`toast.${key}`, params),
      life: 4000,
    });
  }
}
