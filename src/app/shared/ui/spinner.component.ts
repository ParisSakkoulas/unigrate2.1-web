import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'ui-spinner',
  imports: [ProgressSpinnerModule, TranslatePipe],
  host: { class: 'flex items-center justify-center gap-3 py-10 text-slate-500', role: 'status' },
  template: `
    <p-progress-spinner strokeWidth="5" styleClass="!h-8 !w-8" />
    <span>{{ 'common.loading' | translate }}</span>
  `,
})
export class SpinnerComponent {}
