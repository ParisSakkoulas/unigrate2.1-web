import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'ui-card',
  imports: [CardModule, TranslatePipe],
  template: `
    <p-card>
      @if (title(); as t) {
        <ng-template #title>{{ t | translate }}</ng-template>
      }
      <ng-content />
    </p-card>
  `,
})
export class CardComponent {
  /** Translation key */
  readonly title = input<string>();
}
