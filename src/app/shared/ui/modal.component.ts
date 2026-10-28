import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';

/** Render with `@if` in the parent; emits `closed` on Esc, backdrop click or the close icon (the dialog only reports `visibleChange(false)`; the parent removes it) */
@Component({
  selector: 'ui-modal',
  imports: [DialogModule, TranslatePipe],
  template: `
    <p-dialog [visible]="true" [modal]="true" [closable]="true" [dismissableMask]="true"
              [closeOnEscape]="true" [draggable]="false" [header]="title() | translate"
              [style]="{ width: '32rem', maxWidth: '95vw' }" (visibleChange)="$event || closed.emit()">
      <ng-content />
    </p-dialog>
  `,
})
export class ModalComponent {
  /** Translation key */
  readonly title = input.required<string>();
  readonly closed = output<void>();
}
