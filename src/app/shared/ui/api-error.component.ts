import { Component, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ErrorInfo } from '../../core/api-error';
import { AlertComponent } from './alert.component';

/**
 * Red alert for an API error. For INVALID_TRANSITION the state and event names are
 * translated too, so the message reads e.g. "Action Delete is not allowed while the course is Assigned".
 */
@Component({
  selector: 'ui-api-error',
  imports: [AlertComponent],
  template: `
    @if (error(); as e) {
      <ui-alert kind="error">{{ text(e) }}</ui-alert>
    }
  `,
})
export class ApiErrorComponent {
  readonly error = input<ErrorInfo | null>(null);
  private readonly t = inject(TranslateService);

  // Called on every change detection, so the text follows the selected language
  protected text(e: ErrorInfo): string {
    const params = { ...e.params };
    if (params['state']) params['state'] = this.t.instant('courseState.' + params['state']);
    if (params['event']) params['event'] = this.t.instant('courseEvent.' + params['event']);
    return this.t.instant(e.key, params);
  }
}
