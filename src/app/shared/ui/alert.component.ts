import { Component, computed, input } from '@angular/core';
import { MessageModule } from 'primeng/message';

type Kind = 'error' | 'success' | 'info' | 'warning';

@Component({
  selector: 'ui-alert',
  imports: [MessageModule],
  host: { class: 'mb-4 block' },
  template: `<p-message [severity]="severity()" styleClass="w-full"><ng-content /></p-message>`,
})
export class AlertComponent {
  readonly kind = input<Kind>('info');
  protected readonly severity = computed(() => (this.kind() === 'warning' ? 'warn' : this.kind()));
}
