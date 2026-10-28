import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartConfiguration } from 'chart.js';
import { ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { BaseChartDirective } from 'ng2-charts';
import { environment } from '../../../environments/environment';
import { ErrorInfo, toErrorInfo } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { downloadFile } from '../../core/download';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { CardComponent } from '../../shared/ui/card.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';

interface CourseTerm {
  courseId: string;
  name: string;
  year: number;
  semester: number;
  gradesFinalized: boolean;
  passed: number;
  failed: number;
  average: number | null;
  histogram: number[];
}
interface TeacherStats {
  coursesPerYear: { year: number; count: number }[];
  overall: { passed: number; failed: number };
  courseTerms: CourseTerm[];
}
interface StudentStats {
  terms: { year: number; semester: number; passed: number; failed: number }[];
  totalPassed: number;
}

const GREEN = '#16a34a';
const RED = '#dc2626';
const BLUE = '#2563eb';

/** Statistics page: teacher and student see their own charts (the API checks the role) */
@Component({
  selector: 'app-statistics',
  imports: [FormsModule, TranslatePipe, ButtonDirective, Select, BaseChartDirective, ApiErrorComponent, CardComponent, SpinnerComponent],
  template: `
    <h1 class="mb-4 text-2xl font-bold">{{ 'stats.title' | translate }}</h1>
    <ui-api-error [error]="error()" />

    @if (loading()) {
      <ui-spinner />
    }
    @if (teacher(); as t) {
      <div class="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <ui-card title="stats.coursesPerYear">
          @if (t.coursesPerYear.length) {
            <div class="relative h-64 w-full overflow-hidden"><canvas baseChart [data]="barData()" [options]="barOptions" type="bar"></canvas></div>
          } @else {
            <p class="text-slate-500">{{ 'stats.noData' | translate }}</p>
          }
        </ui-card>

        <ui-card title="stats.overall">
          <p class="text-lg" data-testid="overall">
            {{ 'stats.overallText' | translate: { passed: pct(t.overall.passed, t.overall.failed), failed: pct(t.overall.failed, t.overall.passed) } }}
          </p>
          <p class="mt-1 text-sm text-slate-500">{{ 'stats.overallHelp' | translate: { n: t.overall.passed + t.overall.failed } }}</p>
        </ui-card>

        <ui-card title="stats.courseTerm" class="lg:col-span-2">
          <p-select [options]="termOptions()" [(ngModel)]="selected" optionLabel="label" optionValue="key"
                    styleClass="w-full sm:w-96" [placeholder]="'stats.chooseTerm' | translate"
                    [ariaLabel]="'stats.chooseTerm' | translate" />
          @if (term(); as c) {
            @if (c.passed + c.failed === 0) {
              <p class="mt-4 text-slate-500">{{ 'stats.notFinal' | translate }}</p>
            } @else {
              <div class="mt-4 grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
                <div>
                  <h3 class="mb-2 font-semibold">{{ 'stats.passFail' | translate }}</h3>
                  <div class="relative h-64 w-full overflow-hidden"><canvas baseChart [data]="pieData()" type="pie" [options]="pieOptions"></canvas></div>
                </div>
                <div>
                  <h3 class="mb-2 font-semibold">{{ 'stats.histogram' | translate }}</h3>
                  <div class="relative h-64 w-full overflow-hidden"><canvas baseChart [data]="histData()" type="bar" [options]="histOptions"></canvas></div>
                </div>
              </div>
            }
          }
        </ui-card>

        <ui-card title="stats.averages" class="lg:col-span-2">
          @if (avgData().datasets.length) {
            <div class="relative h-72 w-full overflow-hidden"><canvas baseChart [data]="avgData()" type="bar" [options]="avgOptions"></canvas></div>
          } @else {
            <p class="text-slate-500">{{ 'stats.noData' | translate }}</p>
          }
        </ui-card>
      </div>
    }
    @if (student(); as s) {
      <div class="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <ui-card title="stats.termPie">
          @if (s.terms.length) {
            <p-select [options]="studentOptions()" [(ngModel)]="studentSel" optionLabel="label" optionValue="key"
                      styleClass="mb-4 w-full" [ariaLabel]="'stats.chooseTerm' | translate" />
            <div class="relative h-64 w-full overflow-hidden"><canvas baseChart [data]="studentPie()" type="pie" [options]="pieOptions"></canvas></div>
          } @else {
            <p class="text-slate-500">{{ 'stats.noData' | translate }}</p>
          }
        </ui-card>
        <ui-card title="stats.totalPassed">
          <p class="text-4xl font-bold text-green-700" data-testid="total-passed">{{ s.totalPassed }}</p>
          <p class="mt-1 text-slate-600">{{ 'stats.totalPassedText' | translate }}</p>
          <div class="mt-6 flex flex-wrap gap-2">
            <button pButton type="button" icon="pi pi-download" [label]="'stats.transcriptXlsx' | translate" (click)="transcript('xlsx')"></button>
            <button pButton type="button" severity="secondary" icon="pi pi-download" [label]="'stats.transcriptCsv' | translate" (click)="transcript('csv')"></button>
          </div>
        </ui-card>
      </div>
    }
  `,
})
export class StatisticsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(TranslateService);
  private readonly role = inject(AuthService).role;

  protected readonly loading = signal(true);
  protected readonly error = signal<ErrorInfo | null>(null);
  protected readonly teacher = signal<TeacherStats | null>(null);
  protected readonly student = signal<StudentStats | null>(null);
  protected selected: string | null = null;
  protected studentSel: string | null = null;

  // ----- teacher -----
  protected readonly termOptions = computed(() =>
    (this.teacher()?.courseTerms ?? []).map((c) => ({ key: this.key(c), label: `${c.name} · ${c.year}–${c.year + 1} · ${this.sem(c.semester)}` })),
  );
  protected term = () => this.teacher()?.courseTerms.find((c) => this.key(c) === this.selected);

  protected barData = () => ({
    labels: this.teacher()!.coursesPerYear.map((x) => `${x.year}–${x.year + 1}`),
    datasets: [{ data: this.teacher()!.coursesPerYear.map((x) => x.count), label: this.i18n.instant('stats.courses'), backgroundColor: BLUE }],
  });
  protected readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  protected readonly pieOptions: ChartConfiguration<'pie'>['options'] = { maintainAspectRatio: false };
  protected pieData = () => this.pie(this.term()!.passed, this.term()!.failed);
  protected histData = () => ({
    labels: this.term()!.histogram.map((_, i) => `${i}–${i + 1}`),
    datasets: [{ data: this.term()!.histogram, label: this.i18n.instant('stats.students'), backgroundColor: this.term()!.histogram.map((_, i) => (i >= 5 ? GREEN : RED)) }],
  });
  protected readonly histOptions: ChartConfiguration<'bar'>['options'] = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  /** Average final grade per course, one bar group per academic year */
  protected avgData = () => {
    const terms = (this.teacher()?.courseTerms ?? []).filter((c) => c.average !== null);
    const years = [...new Set(terms.map((c) => c.year))].sort();
    const names = [...new Set(terms.map((c) => c.name))];
    return {
      labels: years.map((y) => `${y}–${y + 1}`),
      datasets: names.map((n) => ({
        label: n,
        data: years.map((y) => {
          const row = terms.filter((c) => c.name === n && c.year === y);
          return row.length ? Math.round((row.reduce((a, c) => a + (c.average ?? 0), 0) / row.length) * 100) / 100 : null;
        }),
      })),
    };
  };
  protected readonly avgOptions: ChartConfiguration<'bar'>['options'] = {
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, max: 10 } },
  };

  // ----- student -----
  protected readonly studentOptions = computed(() =>
    (this.student()?.terms ?? []).map((t) => ({ key: `${t.year}-${t.semester}`, label: `${t.year}–${t.year + 1} · ${this.sem(t.semester)}` })),
  );
  protected studentPie = () => {
    const t = this.student()!.terms.find((x) => `${x.year}-${x.semester}` === this.studentSel);
    return this.pie(t?.passed ?? 0, t?.failed ?? 0);
  };

  ngOnInit(): void {
    const role = this.role();
    const url = `${environment.apiUrl}/statistics/${role === 'TEACHER' ? 'teacher' : 'student'}`;
    this.http.get<TeacherStats & StudentStats>(url).subscribe({
      next: (s) => {
        if (role === 'TEACHER') {
          this.teacher.set(s);
          const done = s.courseTerms.filter((c) => c.gradesFinalized);
          const pick = done.at(-1) ?? s.courseTerms.at(-1);
          this.selected = pick ? this.key(pick) : null;
        } else {
          this.student.set(s);
          const last = s.terms.at(-1);
          this.studentSel = last ? `${last.year}-${last.semester}` : null;
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toErrorInfo(err));
        this.loading.set(false);
      },
    });
  }

  protected transcript(format: 'csv' | 'xlsx'): void {
    downloadFile(this.http, `${environment.apiUrl}/statistics/student/transcript?format=${format}`, `transcript.${format}`).subscribe({
      error: (err: unknown) => this.error.set(toErrorInfo(err)),
    });
  }

  protected pct(a: number, b: number): number {
    return a + b === 0 ? 0 : Math.round((a / (a + b)) * 1000) / 10;
  }

  private pie(passed: number, failed: number) {
    return {
      labels: [this.i18n.instant('grades.passed'), this.i18n.instant('grades.failed')],
      datasets: [{ data: [passed, failed], backgroundColor: [GREEN, RED] }],
    };
  }
  private key = (c: CourseTerm) => `${c.courseId}-${c.year}-${c.semester}`;
  private sem = (n: number) => this.i18n.instant('courses.semester_' + n);
}
