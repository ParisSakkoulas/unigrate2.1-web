import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TEACHER_RANKS } from '../core/models';
import { FieldComponent } from './ui/field.component';
import { maxYear, MIN_YEAR, syncRoleValidators, UserForm } from './user-form';

/** First/last name plus the fields that depend on the role (rank or AM + admission year) */
@Component({
  selector: 'app-profile-fields',
  imports: [InputText, Select, ReactiveFormsModule, TranslatePipe, FieldComponent],
  template: `
    <ng-container [formGroup]="form()">
      <ui-field label="user.firstName" help="user.firstNameHelp" inputId="firstName"
                [control]="form().controls.firstName" [required]="true">
        <input id="firstName" pInputText class="w-full" formControlName="firstName" autocomplete="given-name"
               [placeholder]="'user.firstNamePlaceholder' | translate" />
      </ui-field>
      <ui-field label="user.lastName" help="user.lastNameHelp" inputId="lastName"
                [control]="form().controls.lastName" [required]="true">
        <input id="lastName" pInputText class="w-full" formControlName="lastName" autocomplete="family-name"
               [placeholder]="'user.lastNamePlaceholder' | translate" />
      </ui-field>

      @if (form().controls.role.value === 'TEACHER') {
        <ui-field label="user.rank" help="user.rankHelp" inputId="rank"
                  [control]="form().controls.rank" [required]="true">
          <p-select inputId="rank" formControlName="rank" [options]="ranks" styleClass="w-full"
                    [placeholder]="'user.rankPlaceholder' | translate">
            <ng-template #selectedItem let-o>{{ 'ranks.' + o | translate }}</ng-template>
            <ng-template #item let-o>{{ 'ranks.' + o | translate }}</ng-template>
          </p-select>
        </ui-field>
      }

      @if (form().controls.role.value === 'STUDENT') {
        <p class="mb-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700" data-testid="am-auto">
          <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>{{ 'user.studentNumberAuto' | translate }}
        </p>
        <ui-field label="user.admissionYear" help="user.admissionYearHelp" inputId="admissionYear"
                  [control]="form().controls.admissionYear" [required]="true">
          <input id="admissionYear" type="number" pInputText class="w-full" formControlName="admissionYear"
                 [min]="minYear" [max]="maxYear" placeholder="2021" />
        </ui-field>
      }
    </ng-container>
  `,
})
export class ProfileFieldsComponent implements OnInit {
  readonly form = input.required<UserForm>();

  protected readonly ranks = TEACHER_RANKS;
  protected readonly minYear = MIN_YEAR;
  protected readonly maxYear = maxYear();
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    syncRoleValidators(this.form());
    this.form()
      .controls.role.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => syncRoleValidators(this.form()));
  }
}
