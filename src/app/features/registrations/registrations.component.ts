import { PdfExportService } from '../../core/pdf-export.service';
import { ToastService } from '../../core/toast.service';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Observable, forkJoin } from 'rxjs';
import { ErrorInfo, toErrorInfo } from '../../core/api-error';
import { AvailableCourse, MyRegistration } from '../../core/models';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { CardComponent } from '../../shared/ui/card.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CourseStateTagComponent } from '../courses/course-state-tag.component';
import { RegistrationsApi } from './registrations-api.service';

/** Student: register for courses (declaration), finalize it, and see grades */
@Component({
  selector: 'app-registrations',
  imports: [
    FormsModule,
    InputText,
    Select,
    RouterLink,
    TranslatePipe,
    ButtonDirective,
    TableModule,
    TagModule,
    ApiErrorComponent,
    CardComponent,
    ModalComponent,
    SpinnerComponent,
    CourseStateTagComponent,
  ],
  template: `
    <h1 class="mb-4 text-2xl font-bold">{{ 'registrations.title' | translate }}</h1>
    <ui-api-error [error]="error()" />

    @if (loading()) {
      <ui-spinner />
    } @else {
      <ui-card title="registrations.available">
        <p class="mb-3 text-sm text-slate-600">{{ 'registrations.availableHelp' | translate }}</p>
        @if (available().length === 0) {
          <p class="py-4 text-center text-slate-500">{{ 'registrations.noneAvailable' | translate }}</p>
        } @else {
          <div class="mb-3 flex justify-end">
            <button pButton size="small" type="button" icon="pi pi-lock" [disabled]="!hasOpenOwn()" [loading]="busy()"
                    [label]="'registrations.finalizeAll' | translate" (click)="confirmAll.set(true)"></button>
          </div>
          <p-table [value]="available()" dataKey="courseId" styleClass="p-datatable-sm">
            <ng-template #header>
              <tr>
                <th>{{ 'courses.name' | translate }}</th>
                <th>{{ 'courses.teacher' | translate }}</th>
                <th>{{ 'registrations.term' | translate }}</th>
                <th>{{ 'user.status' | translate }}</th>
                <th><span class="sr-only">{{ 'common.actions' | translate }}</span></th>
              </tr>
            </ng-template>
            <ng-template #body let-c>
              <tr>
                <td>
                  <a [routerLink]="['/courses', c.courseId]" class="app-link font-medium">{{ c.name }}</a>
                  @if (c.missingPrerequisites.length) {
                    <p class="mt-1 text-xs text-amber-700">
                      <i class="pi pi-exclamation-triangle mr-1"></i>{{ 'registrations.missing' | translate }}:
                      {{ names(c) }}
                    </p>
                  }
                  @if (c.alreadyPassed) {
                    <p class="mt-1 text-xs text-green-700">
                      <i class="pi pi-check mr-1"></i>{{ 'registrations.alreadyPassed' | translate }}
                    </p>
                  }
                </td>
                <td>{{ c.teacher }}</td>
                <td>{{ c.year }}–{{ c.year + 1 }} · {{ 'courses.semester_' + c.semester | translate }}</td>
                <td>
                  @if (c.registered) {
                    <p-tag [severity]="c.finalized ? 'success' : 'info'"
                           [value]="(c.finalized ? 'registrations.finalized' : 'registrations.registered') | translate" />
                  } @else {
                    <app-course-state-tag [state]="c.state" />
                  }
                </td>
                <td class="whitespace-nowrap text-right">
                  <div class="flex justify-end gap-1">
                    @if (!c.registered) {
                      <button pButton size="small" type="button" [disabled]="c.missingPrerequisites.length > 0 || c.alreadyPassed"
                              (click)="run(api.register(c.courseId), 'registered')">{{ 'registrations.register' | translate }}</button>
                    } @else if (!c.finalized) {
                      <button pButton size="small" severity="secondary" type="button"
                              (click)="run(api.unregister(c.courseId), 'unregistered')">{{ 'registrations.remove' | translate }}</button>
                      <button pButton size="small" type="button"
                              (click)="run(api.finalize(c.courseId), 'registrationFinalized')">{{ 'registrations.finalize' | translate }}</button>
                    }
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </ui-card>

      <ui-card title="registrations.mine" class="mt-6 block">
        @if (mine().length === 0) {
          <p class="py-4 text-center text-slate-500">{{ 'registrations.noneMine' | translate }}</p>
        } @else {
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-slate-600">
              {{ 'registrations.passedCount' | translate: { n: passedCount() } }}
            </p>
            <button pButton size="small" severity="secondary" type="button" icon="pi pi-file-pdf" data-testid="export-pdf"
                    [loading]="exporting()" [label]="'registrations.exportPdf' | translate" (click)="exportPdf()"></button>
          </div>
          <div class="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="mine-filters">
            <input pInputText type="search" class="w-full" [value]="search()" (input)="onSearch($event)"
                   [placeholder]="'registrations.filterSearch' | translate" [attr.aria-label]="'registrations.filterSearch' | translate" />
            <p-select [options]="termOptions()" optionValue="key" [ngModel]="termFilter()" (ngModelChange)="setTerm($event)"
                      [showClear]="true" styleClass="w-full" appendTo="body" [placeholder]="'registrations.filterTerm' | translate">
              <ng-template #selectedItem let-o>{{ o.year }}–{{ o.year + 1 }} · {{ 'courses.semester_' + o.semester | translate }}</ng-template>
              <ng-template #item let-o>{{ o.year }}–{{ o.year + 1 }} · {{ 'courses.semester_' + o.semester | translate }}</ng-template>
            </p-select>
            <p-select [options]="resultOptions" [ngModel]="resultFilter()" (ngModelChange)="setResult($event)"
                      [showClear]="true" styleClass="w-full" appendTo="body" [placeholder]="'registrations.filterResult' | translate">
              <ng-template #selectedItem let-o>{{ 'grades.' + o | translate }}</ng-template>
              <ng-template #item let-o>{{ 'grades.' + o | translate }}</ng-template>
            </p-select>
            <button pButton size="small" severity="secondary" type="button" icon="pi pi-filter-slash"
                    [disabled]="!hasFilter()" [label]="'registrations.clearFilters' | translate" (click)="clearFilters()"></button>
          </div>
          <p-table [value]="filteredMine()" styleClass="p-datatable-sm" [paginator]="true" [rows]="5"
                   [rowsPerPageOptions]="[5, 10, 20]" [first]="first()" (onPage)="first.set($event.first)">
            <ng-template #header>
              <tr>
                <th>{{ 'courses.name' | translate }}</th>
                <th>{{ 'registrations.term' | translate }}</th>
                <th class="text-right">{{ 'grades.theory' | translate }}</th>
                <th class="text-right">{{ 'grades.lab' | translate }}</th>
                <th class="text-right">{{ 'grades.final' | translate }}</th>
                <th>{{ 'grades.result' | translate }}</th>
              </tr>
            </ng-template>
            <ng-template #body let-r>
              <tr>
                <td><a [routerLink]="['/courses', r.courseId]" class="app-link">{{ r.courseName }}</a></td>
                <td>{{ r.year }}–{{ r.year + 1 }} · {{ 'courses.semester_' + r.semester | translate }}</td>
                <td class="text-right">{{ r.gradesPublished ? (r.theoryGrade ?? '–') : '' }}</td>
                <td class="text-right">{{ r.gradesPublished ? (r.labGrade ?? '–') : '' }}</td>
                <td class="text-right font-semibold">{{ r.gradesPublished ? (r.finalGrade ?? '–') : '' }}</td>
                <td>
                  @if (r.gradesPublished) {
                    <p-tag [severity]="r.passed ? 'success' : 'danger'"
                           [value]="(r.passed ? 'grades.passed' : 'grades.failed') | translate" />
                  } @else {
                    <span class="text-sm text-slate-500">{{ 'grades.pending' | translate }}</span>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="6" class="py-4 text-center text-slate-500">{{ 'registrations.noMatch' | translate }}</td></tr>
            </ng-template>
          </p-table>
        }
      </ui-card>
    }

    @if (confirmAll()) {
      <ui-modal title="registrations.finalizeAll" (closed)="confirmAll.set(false)">
        <p class="mb-4">{{ 'registrations.finalizeAllConfirm' | translate }}</p>
        <div class="flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="confirmAll.set(false)">{{ 'common.cancel' | translate }}</button>
          <button pButton type="button" (click)="finalizeAll()">{{ 'registrations.finalize' | translate }}</button>
        </div>
      </ui-modal>
    }
  `,
})
export class RegistrationsComponent implements OnInit {
  private readonly toast = inject(ToastService);
  protected readonly api = inject(RegistrationsApi);

  protected readonly available = signal<AvailableCourse[]>([]);
  protected readonly mine = signal<MyRegistration[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly confirmAll = signal(false);
  protected readonly exporting = signal(false);
  private readonly pdf = inject(PdfExportService);
  protected readonly error = signal<ErrorInfo | null>(null);

  protected readonly hasOpenOwn = computed(() => this.available().some((c) => c.registered && !c.finalized));
  protected readonly passedCount = computed(() => this.mine().filter((r) => r.passed).length);

  // ---- filters of "my registrations and grades" ----
  protected readonly search = signal('');
  protected readonly termFilter = signal<string | null>(null);
  protected readonly resultFilter = signal<string | null>(null);
  protected readonly first = signal(0);
  protected readonly resultOptions = ['passed', 'failed', 'pending'];

  /** Terms that occur in my registrations, newest first */
  protected readonly termOptions = computed(() => {
    const seen = new Map<string, { key: string; year: number; semester: number }>();
    for (const r of this.mine()) seen.set(`${r.year}-${r.semester}`, { key: `${r.year}-${r.semester}`, year: r.year, semester: r.semester });
    return [...seen.values()].sort((a, b) => b.year - a.year || b.semester - a.semester);
  });

  protected readonly hasFilter = computed(() => !!(this.search() || this.termFilter() || this.resultFilter()));

  protected readonly filteredMine = computed(() => {
    const text = this.search().trim().toLowerCase();
    const term = this.termFilter();
    const result = this.resultFilter();
    return this.mine().filter((r) => {
      if (text && !r.courseName.toLowerCase().includes(text)) return false;
      if (term && `${r.year}-${r.semester}` !== term) return false;
      if (result) {
        const state = !r.gradesPublished ? 'pending' : r.passed ? 'passed' : 'failed';
        if (state !== result) return false;
      }
      return true;
    });
  });

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.first.set(0);
  }

  protected setTerm(value: string | null): void {
    this.termFilter.set(value);
    this.first.set(0);
  }

  protected setResult(value: string | null): void {
    this.resultFilter.set(value);
    this.first.set(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.termFilter.set(null);
    this.resultFilter.set(null);
    this.first.set(0);
  }

  ngOnInit(): void {
    this.load();
  }

  protected exportPdf(): void {
    this.exporting.set(true);
    this.pdf
      .registrationsAndGrades(this.mine())
      .catch(() => this.error.set({ key: 'errors.UNKNOWN', params: {} }))
      .finally(() => this.exporting.set(false));
  }

  protected names(c: AvailableCourse): string {
    return c.missingPrerequisites.map((p) => p.name).join(', ');
  }

  /** Runs a command, then refreshes both tables; errors (e.g. missing prerequisites) show on top */
  protected run(call: Observable<unknown>, toastKey: string): void {
    this.error.set(null);
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.toast.success(toastKey);
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(toErrorInfo(err));
      },
    });
  }

  protected finalizeAll(): void {
    this.confirmAll.set(false);
    const open = this.available().filter((c) => c.registered && !c.finalized);
    this.run(forkJoin(open.map((c) => this.api.finalize(c.courseId))), 'registrationFinalized');
  }

  private load(): void {
    forkJoin([this.api.available(), this.api.mine()]).subscribe({
      next: ([available, mine]) => {
        this.available.set(available);
        this.mine.set(mine);
        this.loading.set(false);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toErrorInfo(err));
        this.loading.set(false);
        this.busy.set(false);
      },
    });
  }
}
