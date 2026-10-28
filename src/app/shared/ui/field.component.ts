import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

interface FieldError {
  key: string;
  params?: Record<string, unknown>;
}

/**
 * Label + projected control + red error message + help text.
 * `<ui-field label="…" help="…" [control]="form.controls.x" inputId="x"><input id="x" pInputText class="w-full" …></ui-field>`
 * Label and help are translation keys.
 */
@Component({
  selector: 'ui-field',
  imports: [TranslatePipe],
  template: `
    <div class="mb-4">
      <label [attr.for]="inputId()" class="mb-1 block text-sm font-medium text-slate-700">
        {{ label() | translate }}@if (required()) {<span class="text-red-600" aria-hidden="true"> *</span>}
      </label>
      <ng-content />
      @if (error(); as e) {
        <p class="mt-1 text-sm text-red-600" role="alert">{{ e.key | translate: e.params }}</p>
      } @else {
        @if (help(); as h) {
          <p class="mt-1 text-xs text-slate-500">{{ h | translate }}</p>
        }
      }
    </div>
  `,
})
export class FieldComponent {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly control = input.required<AbstractControl>();
  readonly help = input<string>();
  readonly required = input(false);

  // Re-evaluated on every change detection pass, so it follows the control state
  protected error(): FieldError | null {
    const c = this.control();
    if (!c.errors || !(c.touched || c.dirty)) return null;
    const e = c.errors;
    if (e['server']) return { key: e['server'] as string };
    if (e['required']) return { key: 'form.required' };
    if (e['minlength']) {
      return { key: 'form.minlength', params: { n: e['minlength'].requiredLength } };
    }
    if (e['maxlength']) {
      return { key: 'form.maxlength', params: { n: e['maxlength'].requiredLength } };
    }
    if (e['min']) return { key: 'form.min', params: { n: e['min'].min } };
    if (e['max']) return { key: 'form.max', params: { n: e['max'].max } };
    if (e['pattern']) return { key: 'form.pattern' };
    if (e['mismatch']) return { key: 'form.mismatch' };
    return { key: 'form.invalid' };
  }
}
