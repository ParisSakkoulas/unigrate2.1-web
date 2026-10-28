import { ToastService } from '../../core/toast.service';
import { Component, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Textarea } from 'primeng/textarea';
import { apiErrorCode, apiErrorKey, ErrorInfo, FIELD_ERRORS, toErrorInfo } from '../../core/api-error';
import { setServerError, validateOrReset } from '../../shared/form-utils';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { CardComponent } from '../../shared/ui/card.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CoursesApi } from './courses-api.service';

// Same rules as the backend DTO
const COURSE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .,:&'()+/-]*$/u;
const NO_HTML_PATTERN = /^[^<>]*$/;

/** Create (/courses/new) or edit (/courses/:id/edit) a course */
@Component({
  selector: 'app-course-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ButtonDirective,
    InputText,
    MultiSelect,
    Textarea,
    ApiErrorComponent,
    CardComponent,
    FieldComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-4 text-2xl font-bold">{{ (id() ? 'courses.edit' : 'courses.new') | translate }}</h1>

      @if (loading()) {
        <ui-spinner />
      } @else {
        <ui-card>
          <ui-api-error [error]="error()" />
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <ui-field label="courses.name" help="courses.nameHelp" inputId="name"
                      [control]="form.controls.name" [required]="true">
              <input id="name" pInputText class="w-full" formControlName="name"
                     [placeholder]="'courses.namePlaceholder' | translate" />
            </ui-field>

            <ui-field label="courses.description" help="courses.descriptionHelp" inputId="description"
                      [control]="form.controls.description" [required]="true">
              <textarea id="description" pTextarea class="w-full" rows="6" formControlName="description"
                        [placeholder]="'courses.descriptionPlaceholder' | translate"></textarea>
            </ui-field>

            <ui-field label="courses.prerequisites" help="courses.prerequisitesHelp" inputId="prerequisites"
                      [control]="form.controls.prerequisites">
              <p-multiselect inputId="prerequisites" formControlName="prerequisites" [options]="options()"
                             optionLabel="name" optionValue="id" display="chip" [filter]="true"
                             styleClass="w-full" appendTo="body"
                             [placeholder]="'courses.choosePrerequisites' | translate" />
            </ui-field>

            <div class="mt-2 flex justify-end gap-2">
              <a pButton severity="secondary" [routerLink]="id() ? ['/courses', id()] : ['/courses']">
                {{ 'common.cancel' | translate }}
              </a>
              <button pButton type="submit" [loading]="saving()">{{ 'common.save' | translate }}</button>
            </div>
          </form>
        </ui-card>
      }
    </div>
  `,
})
export class CourseFormComponent {
  private readonly toast = inject(ToastService);
  // Bound from the route; absent when creating
  readonly id = input<string>();

  private readonly api = inject(CoursesApi);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<ErrorInfo | null>(null);
  protected readonly options = signal<{ id: string; name: string }[]>([]);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(COURSE_NAME_PATTERN)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000), Validators.pattern(NO_HTML_PATTERN)]],
    prerequisites: [[] as string[], [Validators.maxLength(10)]],
  });

  constructor() {
    effect(() => this.init(this.id()));
  }

  protected submit(): void {
    this.error.set(null);
    if (!validateOrReset(this.form)) return;

    const body = this.form.getRawValue();
    const id = this.id();
    this.saving.set(true);
    (id ? this.api.update(id, body) : this.api.create(body)).subscribe({
      next: (c) => {
        this.toast.success(id ? 'courseUpdated' : 'courseCreated');
        void this.router.navigate(['/courses', c.id]);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const code = apiErrorCode(err);
        const field = code ? FIELD_ERRORS[code] : undefined;
        const control = field ? this.form.get(field) : null;
        if (control) {
          control.reset('');
          setServerError(control, apiErrorKey(err));
        } else {
          this.error.set(toErrorInfo(err));
        }
      },
    });
  }

  private init(id: string | undefined): void {
    this.error.set(null);
    this.api.search().subscribe((all) =>
      this.options.set(all.filter((c) => c.id !== id).map((c) => ({ id: c.id, name: c.name }))),
    );
    if (!id) return;

    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (c) => {
        this.form.setValue({
          name: c.name,
          description: c.description,
          prerequisites: c.prerequisites.map((p) => p.id),
        });
        // Only PROPOSED courses can be edited; explain it instead of failing on save
        if (!c.allowedEvents.includes('UPDATE_COURSE')) {
          this.error.set({
            key: 'errors.INVALID_TRANSITION',
            params: { state: c.state, event: 'UPDATE_COURSE' },
          });
          this.form.disable();
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toErrorInfo(err));
        this.loading.set(false);
      },
    });
  }
}
