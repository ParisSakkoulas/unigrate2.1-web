import { ToastService } from '../../core/toast.service';
import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Observable } from 'rxjs';
import { ErrorInfo, toErrorInfo } from '../../core/api-error';
import { Course, ImportReport, TeachingRegistration, TeachingView } from '../../core/models';
import { validateOrReset } from '../../shared/form-utils';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { AlertComponent } from '../../shared/ui/alert.component';
import { CardComponent } from '../../shared/ui/card.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { ExportFormat, GradingApi } from './grading-api.service';

type Confirm = 'close' | 'finalize' | 'end';
interface Draft {
  theory: string;
  lab: string;
}

const MAX_YEAR = new Date().getFullYear() + 1;

/**
 * For the teacher of the course (and the admin): grading scheme, registered students,
 * grades (inline, or uploaded from CSV/Excel), exports and the closing steps.
 * What is enabled follows the course's `allowedEvents` (the backend state machine).
 */
@Component({
  selector: 'app-teaching-panel',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonDirective,
    InputText,
    TableModule,
    TagModule,
    AlertComponent,
    ApiErrorComponent,
    CardComponent,
    FieldComponent,
    ModalComponent,
    SpinnerComponent,
  ],
  template: `
    <h2 class="mb-3 mt-8 text-xl font-bold">{{ 'teaching.title' | translate }}</h2>
    <ui-api-error [error]="error()" />

    @if (!view()) {
      <ui-spinner />
    } @else {
      <ui-card title="teaching.scheme">
        <form [formGroup]="scheme" (ngSubmit)="saveScheme()" novalidate class="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
          <ui-field label="teaching.theoryWeight" help="teaching.weightHelp" inputId="theoryPct"
                    [control]="scheme.controls.theoryPct" [required]="true">
            <input id="theoryPct" type="number" min="0" max="100" step="1" pInputText class="w-full"
                   formControlName="theoryPct" />
          </ui-field>
          <ui-field label="teaching.labWeight" help="teaching.labWeightHelp" inputId="labPct"
                    [control]="scheme.controls.labPct" [required]="true">
            <input id="labPct" type="number" min="0" max="100" step="1" pInputText class="w-full"
                   formControlName="labPct" />
          </ui-field>
          <ui-field label="teaching.theoryRetention" help="teaching.retentionHelp" inputId="theoryRet"
                    [control]="scheme.controls.theoryRetentionYear">
            <input id="theoryRet" type="number" pInputText class="w-full" formControlName="theoryRetentionYear" />
          </ui-field>
          <ui-field label="teaching.labRetention" help="teaching.retentionHelp" inputId="labRet"
                    [control]="scheme.controls.labRetentionYear">
            <input id="labRet" type="number" pInputText class="w-full" formControlName="labRetentionYear" />
          </ui-field>
          @if (schemeEditable()) {
            <div class="sm:col-span-2 lg:col-span-4">
              <button pButton type="submit" [loading]="busy()">
                {{ (view()!.teaching.theoryWeight === undefined ? 'teaching.setScheme' : 'teaching.updateScheme') | translate }}
              </button>
              @if (schemeSaved()) {
                <span class="ml-3 text-sm text-green-700" role="status">{{ 'teaching.schemeSaved' | translate }}</span>
              }
            </div>
          } @else {
            <p class="text-sm text-slate-500 sm:col-span-2 lg:col-span-4">{{ 'teaching.schemeLocked' | translate }}</p>
          }
        </form>
      </ui-card>

      <ui-card title="teaching.students" class="mt-6 block">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span class="mr-auto text-sm text-slate-600">
            {{ 'teaching.studentCount' | translate: { n: view()!.registrations.length } }}
            @if (view()!.teaching.gradesFinalized) {
              · <p-tag severity="success" [value]="'teaching.gradesFinal' | translate" />
            }
          </span>

          @if (allows('FINALIZE_REGISTRATION')) {
            <button pButton size="small" type="button" icon="pi pi-lock" [disabled]="view()!.registrations.length === 0"
                    [label]="'teaching.closeRegistrations' | translate" (click)="confirm.set('close')"></button>
          }
          @if (canGrade()) {
            <button pButton size="small" severity="secondary" type="button" icon="pi pi-upload"
                    [label]="'teaching.upload' | translate" (click)="fileInput.click()"></button>
            <input #fileInput type="file" class="hidden" accept=".csv,.xlsx" (change)="upload($event)"
                   [attr.aria-label]="'teaching.upload' | translate" />
          }
          @if (allows('FINALIZE_GRADES')) {
            <button pButton size="small" type="button" icon="pi pi-check-circle"
                    [label]="'teaching.finalizeGrades' | translate" (click)="confirm.set('finalize')"></button>
          }
          @if (allows('END_SEMESTER')) {
            <button pButton size="small" severity="danger" type="button" icon="pi pi-flag"
                    [label]="'teaching.endSemester' | translate" (click)="confirm.set('end')"></button>
          }
        </div>

        @if (view()!.registrations.length > 0) {
          <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-slate-500">{{ 'teaching.exportStudents' | translate }}:</span>
            <button pButton size="small" severity="secondary" type="button" label="CSV" (click)="exportStudents('csv')"></button>
            <button pButton size="small" severity="secondary" type="button" label="Excel" (click)="exportStudents('xlsx')"></button>
            <span class="ml-4 text-slate-500">{{ 'teaching.exportGrades' | translate }}:</span>
            <button pButton size="small" severity="secondary" type="button" label="CSV" (click)="exportGrades('csv')"></button>
            <button pButton size="small" severity="secondary" type="button" label="Excel" (click)="exportGrades('xlsx')"></button>
          </div>
        }

        @if (report(); as r) {
          <ui-alert [kind]="r.rejected.length ? 'warning' : 'success'">
            <div>
            <strong>{{ 'teaching.importResult' | translate: { ok: r.accepted.length, bad: r.rejected.length } }}</strong>
            @if (r.rejected.length) {
              <ul class="mt-2 list-inside list-disc">
                @for (x of r.rejected; track x.row) {
                  <li>
                    {{ 'teaching.row' | translate }} {{ x.row }}
                    @if (x.studentNumber) { ({{ x.studentNumber }}) }:
                    {{ 'teaching.reason.' + x.reason | translate }}
                  </li>
                }
              </ul>
            }
            </div>
          </ui-alert>
        }

        @if (view()!.registrations.length === 0) {
          <p class="py-4 text-center text-slate-500">{{ 'teaching.noStudents' | translate }}</p>
        } @else {
          <p-table [value]="view()!.registrations" dataKey="id" styleClass="p-datatable-sm" [scrollable]="true">
            <ng-template #header>
              <tr>
                <th>{{ 'user.studentNumber' | translate }}</th>
                <th>{{ 'user.name' | translate }}</th>
                <th>{{ 'grades.theory' | translate }}</th>
                <th>{{ 'grades.lab' | translate }}</th>
                <th>{{ 'grades.final' | translate }}</th>
                <th><span class="sr-only">{{ 'common.actions' | translate }}</span></th>
              </tr>
            </ng-template>
            <ng-template #body let-r>
              <tr>
                <td class="font-medium">{{ r.studentNumber }}</td>
                <td>{{ r.lastName }} {{ r.firstName }}</td>
                <td>
                  @if (canGrade()) {
                    <input type="number" min="0" max="10" step="0.1" pInputText class="w-24" [value]="draft(r).theory"
                           [attr.aria-label]="('grades.theory' | translate) + ' ' + r.studentNumber"
                           (input)="edit(r, 'theory', $any($event.target).value)" (keydown.enter)="saveRow(r)" />
                  } @else {
                    {{ r.theoryGrade ?? '–' }}
                  }
                  @if (r.theoryRetained) { <i class="pi pi-history ml-1 text-xs text-slate-500" [title]="'teaching.retained' | translate"></i> }
                </td>
                <td>
                  @if (canGrade()) {
                    <input type="number" min="0" max="10" step="0.1" pInputText class="w-24" [value]="draft(r).lab"
                           [attr.aria-label]="('grades.lab' | translate) + ' ' + r.studentNumber"
                           (input)="edit(r, 'lab', $any($event.target).value)" (keydown.enter)="saveRow(r)" />
                  } @else {
                    {{ r.labGrade ?? '–' }}
                  }
                  @if (r.labRetained) { <i class="pi pi-history ml-1 text-xs text-slate-500" [title]="'teaching.retained' | translate"></i> }
                </td>
                <td class="font-semibold">{{ r.finalGrade ?? '–' }}</td>
                <td class="text-right">
                  @if (canGrade() && isDirty(r)) {
                    <button pButton size="small" type="button" [label]="'common.save' | translate" (click)="saveRow(r)"></button>
                  }
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </ui-card>
    }

    @if (confirm(); as c) {
      <ui-modal [title]="'teaching.confirm_' + c" (closed)="confirm.set(null)">
        <p class="mb-4">{{ 'teaching.confirmText_' + c | translate }}</p>
        <div class="flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="confirm.set(null)">{{ 'common.cancel' | translate }}</button>
          <button pButton [severity]="c === 'end' ? 'danger' : 'primary'" type="button" [loading]="busy()" (click)="doConfirm(c)">
            {{ 'teaching.confirmButton_' + c | translate }}
          </button>
        </div>
      </ui-modal>
    }
  `,
})
export class TeachingPanelComponent implements OnInit {
  private readonly toast = inject(ToastService);
  readonly course = input.required<Course>();
  /** Emitted after anything that may change the course state, so the page reloads the course */
  readonly changed = output<void>();

  private readonly api = inject(GradingApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly view = signal<TeachingView | null>(null);
  protected readonly error = signal<ErrorInfo | null>(null);
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly confirm = signal<Confirm | null>(null);
  protected readonly busy = signal(false);
  protected readonly schemeSaved = signal(false);
  private readonly drafts = signal<Record<string, Draft>>({});

  protected readonly scheme = this.fb.group({
    theoryPct: [60, [Validators.required, Validators.min(0), Validators.max(100)]],
    labPct: [40, [Validators.required, Validators.min(0), Validators.max(100)]],
    theoryRetentionYear: [null as number | null, [Validators.min(1990), Validators.max(MAX_YEAR)]],
    labRetentionYear: [null as number | null, [Validators.min(1990), Validators.max(MAX_YEAR)]],
  });

  protected readonly schemeEditable = computed(
    () => this.allows('SET_GRADING_SCHEME') || this.allows('UPDATE_GRADING_SCHEME'),
  );
  protected readonly canGrade = computed(() => this.allows('INSERT_GRADES') || this.allows('UPDATE_GRADES'));

  constructor() {
    // Scheme is editable only in the states the state machine allows
    effect(() => {
      if (this.schemeEditable()) this.scheme.enable({ emitEvent: false });
      else this.scheme.disable({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    // The lab weight follows the theory weight, so the two always add up to 100 %
    this.scheme.controls.theoryPct.valueChanges.subscribe((v) => {
      if (typeof v === 'number') this.scheme.controls.labPct.setValue(Math.round((100 - v) * 100) / 100, { emitEvent: false });
    });
    this.scheme.controls.labPct.valueChanges.subscribe((v) => {
      if (typeof v === 'number') this.scheme.controls.theoryPct.setValue(Math.round((100 - v) * 100) / 100, { emitEvent: false });
    });
    this.load();
  }

  protected allows = (event: string): boolean => this.course().allowedEvents.includes(event);

  // ---------- grading scheme ----------

  protected saveScheme(): void {
    this.schemeSaved.set(false);
    this.error.set(null);
    if (!validateOrReset(this.scheme)) return;
    const v = this.scheme.getRawValue();
    this.run(
      this.api.setScheme(this.course().id, {
        theoryWeight: v.theoryPct / 100,
        labWeight: v.labPct / 100,
        ...(v.theoryRetentionYear ? { theoryRetentionYear: Number(v.theoryRetentionYear) } : {}),
        ...(v.labRetentionYear ? { labRetentionYear: Number(v.labRetentionYear) } : {}),
      }),
      () => this.schemeSaved.set(true),
      undefined,
      'schemeSaved',
    );
  }

  // ---------- grades ----------

  protected draft(r: TeachingRegistration): Draft {
    return this.drafts()[r.id] ?? { theory: r.theoryGrade?.toString() ?? '', lab: r.labGrade?.toString() ?? '' };
  }

  protected edit(r: TeachingRegistration, part: keyof Draft, value: string): void {
    this.drafts.update((d) => ({ ...d, [r.id]: { ...this.draft(r), [part]: value } }));
  }

  protected isDirty(r: TeachingRegistration): boolean {
    const d = this.drafts()[r.id];
    return !!d && (d.theory !== (r.theoryGrade?.toString() ?? '') || d.lab !== (r.labGrade?.toString() ?? ''));
  }

  protected saveRow(r: TeachingRegistration): void {
    if (!this.isDirty(r)) return;
    const d = this.draft(r);
    const body: { theoryGrade?: number; labGrade?: number } = {};
    if (d.theory !== '') body.theoryGrade = Number(d.theory.replace(',', '.'));
    if (d.lab !== '') body.labGrade = Number(d.lab.replace(',', '.'));
    this.run(this.api.setGrade(this.course().id, r.id, body), () => this.drafts.update(({ [r.id]: _, ...rest }) => rest), undefined, 'gradeSaved');
  }

  protected upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again
    if (!file) return;
    this.report.set(null);
    this.error.set(null);
    this.busy.set(true);
    this.api.importGrades(this.course().id, file).subscribe({
      next: (r) => {
        this.report.set(r);
        this.toast.success('gradesImported');
        this.afterChange();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(toErrorInfo(err));
      },
    });
  }

  // ---------- closing steps and exports ----------

  protected doConfirm(action: Confirm): void {
    const id = this.course().id;
    const call = { close: this.api.closeRegistrations(id), finalize: this.api.finalizeGrades(id), end: this.api.endSemester(id) }[action];
    this.report.set(null);
    this.run(call, () => this.confirm.set(null), () => this.confirm.set(null), `teaching_${action}`);
  }

  protected exportStudents(format: ExportFormat): void {
    this.download(this.api.exportStudents(this.course().id, format, this.course().name));
  }
  protected exportGrades(format: ExportFormat): void {
    this.download(this.api.exportGrades(this.course().id, format, this.course().name));
  }

  // ---------- helpers ----------

  private download(call: Observable<unknown>): void {
    this.error.set(null);
    call.subscribe({ error: (err: unknown) => this.error.set(toErrorInfo(err)) });
  }

  private run(call: Observable<unknown>, ok?: () => void, fail?: () => void, toastKey?: string): void {
    this.error.set(null);
    this.busy.set(true);
    call.subscribe({
      next: () => {
        if (toastKey) this.toast.success(toastKey);
        ok?.();
        this.afterChange();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        fail?.();
        this.error.set(toErrorInfo(err));
      },
    });
  }

  private afterChange(): void {
    this.load();
    this.changed.emit();
  }

  private load(): void {
    this.api.view(this.course().id).subscribe({
      next: (v) => {
        this.view.set(v);
        this.busy.set(false);
        if (v.teaching.theoryWeight !== undefined && v.teaching.labWeight !== undefined) {
          this.scheme.patchValue(
            {
              theoryPct: Math.round(v.teaching.theoryWeight * 10000) / 100,
              labPct: Math.round(v.teaching.labWeight * 10000) / 100,
              theoryRetentionYear: v.teaching.theoryRetentionYear ?? null,
              labRetentionYear: v.teaching.labRetentionYear ?? null,
            },
            { emitEvent: false },
          );
        }
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(toErrorInfo(err));
      },
    });
  }
}
