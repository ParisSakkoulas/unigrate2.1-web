import { Component, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ErrorInfo, toErrorInfo } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { COURSE_STATES, Course, CourseState } from '../../core/models';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { CardComponent } from '../../shared/ui/card.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CourseStateTagComponent } from './course-state-tag.component';
import { CoursesApi } from './courses-api.service';

/** Public course search. The search text and state live in the URL (?q=…&state=…). */
@Component({
  selector: 'app-course-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ButtonDirective,
    InputText,
    Select,
    ApiErrorComponent,
    CardComponent,
    SpinnerComponent,
    CourseStateTagComponent,
  ],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ 'courses.title' | translate }}</h1>
      @if (canManage()) {
        <a pButton routerLink="/courses/new" icon="pi pi-plus" [label]="'courses.new' | translate"></a>
      }
    </div>

    <form class="mb-4 grid gap-3 sm:grid-cols-[1fr_16rem]" role="search" (submit)="$event.preventDefault()">
      <span class="relative block">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input pInputText class="w-full !pl-9" type="search" [formControl]="search"
               [attr.aria-label]="'courses.search' | translate"
               [placeholder]="'courses.searchPlaceholder' | translate" />
      </span>
      <p-select [formControl]="stateFilter" [options]="states" [showClear]="true" styleClass="w-full"
                [placeholder]="'courses.allStates' | translate" [ariaLabel]="'courses.state' | translate">
        <ng-template #selectedItem let-o>{{ 'courseState.' + o | translate }}</ng-template>
        <ng-template #item let-o>{{ 'courseState.' + o | translate }}</ng-template>
      </p-select>
    </form>

    <ui-api-error [error]="error()" />

    @if (loading()) {
      <ui-spinner />
    } @else if (courses().length === 0) {
      <p class="py-10 text-center text-slate-500">{{ 'courses.empty' | translate }}</p>
    } @else {
      <p class="mb-2 text-sm text-slate-500" aria-live="polite">
        {{ 'courses.count' | translate: { n: courses().length } }}
      </p>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (c of courses(); track c.id) {
          <li>
            <ui-card>
              <div class="mb-2 flex items-start justify-between gap-2">
                <h2 class="text-lg font-semibold leading-tight">
                  <a [routerLink]="['/courses', c.id]" class="app-link no-underline hover:underline">{{ c.name }}</a>
                </h2>
                <app-course-state-tag [state]="c.state" />
              </div>
              <p class="line-clamp-3 text-sm text-slate-600">{{ c.description }}</p>
              @if (c.teaching; as t) {
                <p class="mt-3 text-xs text-slate-500">
                  <i class="pi pi-user mr-1"></i>{{ t.teacher.firstName }} {{ t.teacher.lastName }}
                </p>
              }
              @if (c.prerequisites.length) {
                <p class="mt-1 text-xs text-slate-500">
                  {{ 'courses.prerequisites' | translate }}: {{ prerequisiteNames(c) }}
                </p>
              }
            </ui-card>
          </li>
        }
      </ul>
    }
  `,
})
export class CourseListComponent {
  // Bound from the query string (withComponentInputBinding)
  readonly q = input<string>();
  readonly state = input<string>();

  private readonly api = inject(CoursesApi);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly states = COURSE_STATES;
  protected readonly courses = signal<Course[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<ErrorInfo | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly stateFilter = new FormControl<CourseState | null>(null);

  protected canManage = () => ['ADMIN', 'TEACHER'].includes(this.auth.role());

  constructor() {
    // URL -> controls -> request
    effect(() => {
      const q = this.q() ?? '';
      const s = COURSE_STATES.find((x) => x === this.state()) ?? null;
      this.search.setValue(q, { emitEvent: false });
      this.stateFilter.setValue(s, { emitEvent: false });
      this.load(q, s);
    });

    // Controls -> URL
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.updateUrl());
    this.stateFilter.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateUrl());
  }

  protected prerequisiteNames(c: Course): string {
    return c.prerequisites.map((p) => p.name).join(', ');
  }

  private updateUrl(): void {
    const q = this.search.value.trim();
    void this.router.navigate([], {
      queryParams: { q: q || null, state: this.stateFilter.value || null },
      replaceUrl: true,
    });
  }

  private load(q: string, state: CourseState | null): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.search(q, state ?? '').subscribe({
      next: (list) => {
        this.courses.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        // e.g. the API rejects illegal characters in the search text
        this.error.set(toErrorInfo(err));
        this.courses.set([]);
        this.loading.set(false);
      },
    });
  }
}
