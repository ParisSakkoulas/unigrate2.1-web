import { ToastService } from '../../core/toast.service';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { Observable } from 'rxjs';
import { ErrorInfo, toErrorInfo } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { COURSE_STATES, Course, TeacherSummary } from '../../core/models';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { CardComponent } from '../../shared/ui/card.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { TeachingPanelComponent } from '../teaching/teaching-panel.component';
import { CourseStateTagComponent } from './course-state-tag.component';
import { CoursesApi } from './courses-api.service';

/** Course details. Actions shown depend on the user's role AND the course state. */
@Component({
  selector: 'app-course-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ButtonDirective,
    Select,
    ApiErrorComponent,
    CardComponent,
    ModalComponent,
    SpinnerComponent,
    CourseStateTagComponent,
    TeachingPanelComponent,
  ],
  template: `
    <ui-api-error [error]="error()" />

    @if (loading()) {
      <ui-spinner />
    }
    @if (!loading() && course(); as c) {
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="mb-2 text-2xl font-bold">{{ c.name }}</h1>
          <app-course-state-tag [state]="c.state" />
        </div>
        <div class="flex flex-wrap gap-2">
          @if (canEdit()) {
            <a pButton severity="secondary" icon="pi pi-pencil" [routerLink]="['/courses', c.id, 'edit']"
               [label]="'common.edit' | translate"></a>
          }
          @if (canDelete()) {
            <button pButton severity="danger" icon="pi pi-trash" type="button"
                    [label]="'common.delete' | translate" (click)="confirmDelete.set(true)"></button>
          }
          @if (canAssign()) {
            <button pButton icon="pi pi-user-plus" type="button"
                    [label]="'courses.assign' | translate" (click)="openAssign()"></button>
          }
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <ui-card title="courses.description" class="lg:col-span-2">
          <p class="whitespace-pre-line">{{ c.description }}</p>

          <h3 class="mb-2 mt-6 font-semibold" id="prereq">{{ 'courses.prerequisites' | translate }}</h3>
          @if (c.prerequisites.length) {
            <ul class="list-inside list-disc" aria-labelledby="prereq">
              @for (p of c.prerequisites; track p.id) {
                <li><a [routerLink]="['/courses', p.id]" class="app-link">{{ p.name }}</a></li>
              }
            </ul>
          } @else {
            <p class="text-sm text-slate-500">{{ 'courses.noPrerequisites' | translate }}</p>
          }
        </ui-card>

        <div class="grid content-start gap-6">
          <ui-card title="courses.teaching">
            @if (c.teaching; as t) {
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt class="text-slate-500">{{ 'courses.teacher' | translate }}</dt>
                <dd>{{ t.teacher.firstName }} {{ t.teacher.lastName }}</dd>
                <dt class="text-slate-500">{{ 'user.rank' | translate }}</dt>
                <dd>{{ 'ranks.' + t.teacher.rank | translate }}</dd>
                <dt class="text-slate-500">{{ 'courses.academicYear' | translate }}</dt>
                <dd>{{ t.year }}–{{ t.year + 1 }}</dd>
                <dt class="text-slate-500">{{ 'courses.semester' | translate }}</dt>
                <dd>{{ 'courses.semester_' + t.semester | translate }}</dd>
              </dl>
            } @else {
              <p class="text-sm text-slate-500">{{ 'courses.notAssigned' | translate }}</p>
            }
          </ui-card>

          <ui-card title="courses.lifecycle">
            <ol class="grid gap-1 text-sm">
              @for (s of states; track s; let i = $index) {
                <li class="flex items-center gap-2" [class]="i < currentIndex() ? 'text-slate-400' : i === currentIndex() ? 'font-semibold' : 'text-slate-500'">
                  <i class="pi" [class]="i < currentIndex() ? 'pi-check-circle text-green-600' : i === currentIndex() ? 'pi-arrow-circle-right text-blue-600' : 'pi-circle'"></i>
                  {{ 'courseState.' + s | translate }}
                </li>
              }
            </ol>
          </ui-card>
        </div>
      </div>
    }

    @if (!loading() && course(); as c) {
      @if (showPanel()) {
        <app-teaching-panel [course]="c" (changed)="refresh()" />
      }
      @if (isStudent() && registrationOpen()) {
        <p class="mt-6">
          <a pButton routerLink="/registrations" icon="pi pi-pencil" [label]="'courses.goRegister' | translate"></a>
        </p>
      }
    }

    @if (!loading()) {
      <p class="mt-6 text-sm"><a routerLink="/courses" class="app-link">← {{ 'courses.back' | translate }}</a></p>
    }

    @if (assigning()) {
      <ui-modal title="courses.assignTitle" (closed)="assigning.set(false)">
        <p class="mb-3 text-sm text-slate-600">{{ 'courses.assignHelp' | translate }}</p>
        <label for="teacher" class="mb-1 block text-sm font-medium">{{ 'courses.teacher' | translate }}</label>
        <p-select inputId="teacher" [formControl]="teacher" [options]="teachers()" optionValue="id"
                  styleClass="w-full" appendTo="body" [placeholder]="'courses.chooseTeacher' | translate">
          <ng-template #selectedItem let-o>{{ o.firstName }} {{ o.lastName }}</ng-template>
          <ng-template #item let-o>{{ o.firstName }} {{ o.lastName }} · {{ 'ranks.' + o.rank | translate }}</ng-template>
        </p-select>
        @if (teacher.touched && teacher.invalid) {
          <p class="mt-1 text-sm text-red-600" role="alert">{{ 'form.required' | translate }}</p>
        }
        <ui-api-error [error]="dialogError()" />
        <div class="mt-4 flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="assigning.set(false)">{{ 'common.cancel' | translate }}</button>
          <button pButton type="button" [loading]="busy()" (click)="assign()">{{ 'courses.assign' | translate }}</button>
        </div>
      </ui-modal>
    }

    @if (confirmDelete()) {
      <ui-modal title="courses.deleteTitle" (closed)="confirmDelete.set(false)">
        <p class="mb-4">{{ 'courses.deleteConfirm' | translate: { name: course()?.name } }}</p>
        <ui-api-error [error]="dialogError()" />
        <div class="flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="confirmDelete.set(false)">{{ 'common.cancel' | translate }}</button>
          <button pButton severity="danger" type="button" [loading]="busy()" (click)="remove()">{{ 'common.delete' | translate }}</button>
        </div>
      </ui-modal>
    }
  `,
})
export class CourseDetailComponent {
  private readonly toast = inject(ToastService);
  // Bound from the route (/courses/:id)
  readonly id = input.required<string>();

  private readonly api = inject(CoursesApi);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly states = COURSE_STATES;
  protected readonly course = signal<Course | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<ErrorInfo | null>(null);
  protected readonly dialogError = signal<ErrorInfo | null>(null);
  protected readonly assigning = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly teachers = signal<TeacherSummary[]>([]);
  protected readonly teacher = new FormControl<string | null>(null, Validators.required);

  protected readonly currentIndex = computed(() => COURSE_STATES.indexOf(this.course()?.state ?? 'PROPOSED'));

  private readonly isStaff = computed(() => ['ADMIN', 'TEACHER'].includes(this.auth.role()));
  private readonly allows = (event: string) => this.course()?.allowedEvents.includes(event) ?? false;
  protected readonly canEdit = computed(() => this.isStaff() && this.allows('UPDATE_COURSE'));
  protected readonly canDelete = computed(() => this.isStaff() && this.allows('DELETE'));
  protected readonly canAssign = computed(() => this.auth.role() === 'ADMIN' && this.allows('ASSIGN'));

  protected readonly isStudent = computed(() => this.auth.role() === 'STUDENT');
  protected readonly registrationOpen = computed(() =>
    ['GRADING_DEFINED', 'PARTIALLY_REGISTERED'].includes(this.course()?.state ?? ''),
  );
  /** Admin, or the teacher this course is assigned to, once it has a teaching */
  protected readonly showPanel = computed(() => {
    const t = this.course()?.teaching;
    if (!t) return false;
    const user = this.auth.user();
    const role = this.auth.role(); // VISITOR when browsing another department
    return role === 'ADMIN' || (role === 'TEACHER' && user?.profileId === t.teacher.id);
  });

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected openAssign(): void {
    this.teacher.reset(null);
    this.dialogError.set(null);
    this.assigning.set(true);
    this.api.teachers().subscribe({
      next: (list) => this.teachers.set(list),
      error: (err: unknown) => this.dialogError.set(toErrorInfo(err)),
    });
  }

  protected assign(): void {
    this.teacher.markAsTouched();
    if (this.teacher.invalid) return;
    this.run(
      this.api.assign(this.id(), this.teacher.value as string),
      (c) => {
        this.course.set(c);
        this.assigning.set(false);
      },
      'courseAssigned',
    );
  }

  protected remove(): void {
    this.run(this.api.remove(this.id()), () => void this.router.navigate(['/courses']), 'courseDeleted');
  }

  /** Runs a command; a rejected state transition etc. is shown in the open dialog */
  private run<T>(call: Observable<T>, done: (r: T) => void, toastKey: string): void {
    this.busy.set(true);
    this.dialogError.set(null);
    call.subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.success(toastKey);
        done(r);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (this.confirmDelete() || this.assigning()) {
          this.dialogError.set(toErrorInfo(err));
        } else {
          this.error.set(toErrorInfo(err));
        }
      },
    });
  }

  /** Reload without the spinner (the teaching panel stays mounted) */
  protected refresh(): void {
    this.api.get(this.id()).subscribe({ next: (c) => this.course.set(c) });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(id).subscribe({
      next: (c) => {
        this.course.set(c);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.course.set(null);
        this.error.set(toErrorInfo(err));
        this.loading.set(false);
      },
    });
  }
}
