import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { CourseState } from '../../core/models';

type Severity = 'secondary' | 'info' | 'warn' | 'success' | 'contrast';

const SEVERITY: Record<CourseState, Severity> = {
  PROPOSED: 'secondary',
  ASSIGNED: 'info',
  GRADING_DEFINED: 'info',
  PARTIALLY_REGISTERED: 'warn',
  FULLY_REGISTERED: 'warn',
  PARTIALLY_GRADED: 'contrast',
  FULLY_GRADED: 'success',
};

/** State badge shown on every course */
@Component({
  selector: 'app-course-state-tag',
  imports: [TagModule, TranslatePipe],
  template: `<p-tag [value]="'courseState.' + state() | translate" [severity]="severity()" />`,
})
export class CourseStateTagComponent {
  readonly state = input.required<CourseState>();
  protected readonly severity = computed(() => SEVERITY[this.state()]);
}
