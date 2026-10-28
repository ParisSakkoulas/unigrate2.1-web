import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { AuthService } from '../core/auth.service';
import { DepartmentService } from '../core/department.service';
import { ModalComponent } from '../shared/ui/modal.component';

/** Choose university and department. A logged-in user may look around too, but is only a visitor there. */
@Component({
  selector: 'app-department-switcher',
  imports: [FormsModule, TranslatePipe, ButtonDirective, Select, ModalComponent],
  template: `
    <ui-modal title="dept.choose" (closed)="closed.emit()">
      <p class="mb-3 text-sm text-slate-600">{{ 'dept.chooseHelp' | translate }}</p>

      <label for="uni" class="mb-1 block text-sm font-medium">{{ 'dept.university' | translate }}</label>
      <p-select inputId="uni" [options]="departments.universities()" optionLabel="name" optionValue="id"
                [ngModel]="university()" (ngModelChange)="pickUniversity($event)" styleClass="mb-4 w-full" appendTo="body" />

      <label for="dep" class="mb-1 block text-sm font-medium">{{ 'dept.department' | translate }}</label>
      <p-select inputId="dep" [options]="options()" optionLabel="name" optionValue="id"
                [(ngModel)]="department" styleClass="mb-4 w-full" appendTo="body"
                [placeholder]="'dept.chooseDepartment' | translate" />

      @if (auth.isLoggedIn() && chosenIsForeign()) {
        <p class="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{{ 'dept.foreignNote' | translate }}</p>
      }

      <div class="flex flex-wrap justify-end gap-2">
        @if (auth.user()?.department; as own) {
          @if (own !== departments.selectedId()) {
            <button pButton severity="secondary" type="button" (click)="backToMine(own)">{{ 'dept.backToMine' | translate }}</button>
          }
        }
        <button pButton severity="secondary" type="button" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
        <button pButton type="button" [disabled]="!department()" (click)="apply()">{{ 'dept.show' | translate }}</button>
      </div>
    </ui-modal>
  `,
})
export class DepartmentSwitcherComponent {
  protected readonly departments = inject(DepartmentService);
  protected readonly auth = inject(AuthService);
  readonly closed = output<void>();
  readonly applied = output<void>();

  protected readonly university = signal<string | null>(this.departments.selected()?.university.id ?? null);
  protected readonly department = signal<string | null>(this.departments.selectedId());
  protected readonly options = computed(() =>
    this.departments.departments().filter((d) => d.university.id === this.university()),
  );
  protected readonly chosenIsForeign = computed(
    () => !!this.department() && this.department() !== this.auth.user()?.department,
  );

  protected pickUniversity(id: string): void {
    this.university.set(id);
    this.department.set(this.options()[0]?.id ?? null);
  }

  protected apply(): void {
    const chosen = this.departments.departments().find((d) => d.id === this.department());
    if (chosen) this.departments.select(chosen);
    this.applied.emit();
    this.closed.emit();
  }

  protected backToMine(own: string): void {
    void this.departments.selectById(own);
    this.applied.emit();
    this.closed.emit();
  }
}
