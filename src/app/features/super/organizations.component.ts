import { ToastService } from '../../core/toast.service';
import { Password } from 'primeng/password';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorCode, apiErrorKey, ErrorInfo, FIELD_ERRORS, toErrorInfo } from '../../core/api-error';
import { OrganizationOverview } from '../../core/models';
import { DepartmentService } from '../../core/department.service';
import { LOGIN_PATTERN, NAME_PATTERN, setServerError, validateOrReset } from '../../shared/form-utils';
import { ApiErrorComponent } from '../../shared/ui/api-error.component';
import { CardComponent } from '../../shared/ui/card.component';
import { FieldComponent } from '../../shared/ui/field.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';

type Dialog =
  | { kind: 'university'; id?: string }
  | { kind: 'department'; university: string; id?: string }
  | { kind: 'admin'; department: string; name: string }
  | { kind: 'delete'; what: 'universities' | 'departments'; id: string; name: string };

// Same rules as the backend DTOs
const ORG_NAME = /^[\p{L}\p{N}][\p{L}\p{N} .,:&'()/-]*$/u;
const LOGO = /^(https:\/\/[^\s<>"']+|assets\/[A-Za-z0-9._/-]+)$/;

/** Super admin: universities, departments and the admin of each department */
@Component({
  selector: 'app-organizations',
  imports: [Password, ReactiveFormsModule, TranslatePipe, ButtonDirective, InputText, Select, TagModule, ApiErrorComponent, CardComponent, FieldComponent, ModalComponent, SpinnerComponent],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ 'org.title' | translate }}</h1>
      <button pButton type="button" icon="pi pi-plus" [label]="'org.newUniversity' | translate" (click)="openUniversity()"></button>
    </div>
    <ui-api-error [error]="error()" />

    @if (loading()) {
      <ui-spinner />
    } @else if (data().length === 0) {
      <p class="py-8 text-center text-slate-500">{{ 'org.empty' | translate }}</p>
    }
    <div class="grid gap-6">
      @for (u of data(); track u.id) {
        <ui-card>
          <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="text-lg font-semibold">
                {{ u.name }}
                @if (u.status === 'INACTIVE') { <p-tag severity="warn" [value]="'org.inactive' | translate" /> }
              </h2>
              <p class="text-sm text-slate-500">{{ u.city }}{{ u.city && u.country ? ', ' : '' }}{{ u.country }}</p>
            </div>
            <div class="flex flex-wrap gap-1">
              <button pButton size="small" severity="secondary" type="button" [label]="'common.edit' | translate" (click)="openUniversity(u)"></button>
              <button pButton size="small" severity="secondary" type="button" icon="pi pi-plus" [label]="'org.newDepartment' | translate" (click)="openDepartment(u.id)"></button>
              <button pButton size="small" severity="danger" type="button" [label]="'common.delete' | translate" (click)="dialog.set({ kind: 'delete', what: 'universities', id: u.id, name: u.name })"></button>
            </div>
          </div>
          @if (u.departments.length === 0) {
            <p class="text-sm text-slate-500">{{ 'org.noDepartments' | translate }}</p>
          } @else {
            <ul class="divide-y divide-slate-100">
              @for (d of u.departments; track d.id) {
                <li class="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <span class="font-medium">{{ d.name }}</span>
                    <span class="ml-1 text-xs text-slate-500">({{ d.code }})</span>
                    @if (d.status === 'INACTIVE') { <p-tag severity="warn" [value]="'org.inactive' | translate" /> }
                    <p class="text-xs text-slate-500">
                      {{ 'org.admin' | translate }}:
                      @if (d.adminLogin) { <strong>{{ d.adminLogin }}</strong> } @else { <em>{{ 'org.noAdmin' | translate }}</em> }
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    @if (!d.adminLogin) {
                      <button pButton size="small" type="button" icon="pi pi-user-plus" [label]="'org.createAdmin' | translate" (click)="openAdmin(d.id, d.name)"></button>
                    }
                    <button pButton size="small" severity="secondary" type="button" [label]="'common.edit' | translate" (click)="openDepartment(u.id, d)"></button>
                    <button pButton size="small" severity="danger" type="button" [label]="'common.delete' | translate" (click)="dialog.set({ kind: 'delete', what: 'departments', id: d.id, name: d.name })"></button>
                  </div>
                </li>
              }
            </ul>
          }
        </ui-card>
      }
    </div>

    @if (dialog(); as dlg) {
      @switch (dlg.kind) {
        @case ('university') {
          <ui-modal [title]="dlg.id ? 'org.editUniversity' : 'org.newUniversity'" (closed)="close()">
            <ui-api-error [error]="dialogError()" />
            <form [formGroup]="uni" (ngSubmit)="saveUniversity()" novalidate>
              <ui-field label="org.name" inputId="uname" [control]="uni.controls.name" [required]="true">
                <input id="uname" pInputText class="w-full" formControlName="name" />
              </ui-field>
              <ui-field label="org.logo" help="org.logoHelp" inputId="ulogo" [control]="uni.controls.logoUrl">
                <input id="ulogo" pInputText class="w-full" formControlName="logoUrl" placeholder="https://… / assets/logos/x.svg" />
              </ui-field>
              <div class="grid gap-x-3 sm:grid-cols-2">
                <ui-field label="org.country" inputId="ucountry" [control]="uni.controls.country">
                  <input id="ucountry" pInputText class="w-full" formControlName="country" />
                </ui-field>
                <ui-field label="org.city" inputId="ucity" [control]="uni.controls.city">
                  <input id="ucity" pInputText class="w-full" formControlName="city" />
                </ui-field>
              </div>
              <ui-field label="org.status" inputId="ustatus" [control]="uni.controls.status">
                <p-select inputId="ustatus" formControlName="status" [options]="statuses" styleClass="w-full" appendTo="body">
                  <ng-template #selectedItem let-o>{{ 'org.status_' + o | translate }}</ng-template>
                  <ng-template #item let-o>{{ 'org.status_' + o | translate }}</ng-template>
                </p-select>
              </ui-field>
              <div class="flex justify-end gap-2">
                <button pButton severity="secondary" type="button" (click)="close()">{{ 'common.cancel' | translate }}</button>
                <button pButton type="submit" [loading]="busy()">{{ 'common.save' | translate }}</button>
              </div>
            </form>
          </ui-modal>
        }
        @case ('department') {
          <ui-modal [title]="dlg.id ? 'org.editDepartment' : 'org.newDepartment'" (closed)="close()">
            <ui-api-error [error]="dialogError()" />
            <form [formGroup]="dep" (ngSubmit)="saveDepartment()" novalidate>
              <ui-field label="org.name" inputId="dname" [control]="dep.controls.name" [required]="true">
                <input id="dname" pInputText class="w-full" formControlName="name" />
              </ui-field>
              <ui-field label="org.code" help="org.codeHelp" inputId="dcode" [control]="dep.controls.code" [required]="true">
                <input id="dcode" pInputText class="w-full uppercase" formControlName="code" maxlength="8" placeholder="ICSD" />
              </ui-field>
              <ui-field label="org.logo" help="org.logoHelp" inputId="dlogo" [control]="dep.controls.logoUrl">
                <input id="dlogo" pInputText class="w-full" formControlName="logoUrl" />
              </ui-field>
              <ui-field label="org.status" help="org.statusHelp" inputId="dstatus" [control]="dep.controls.status">
                <p-select inputId="dstatus" formControlName="status" [options]="statuses" styleClass="w-full" appendTo="body">
                  <ng-template #selectedItem let-o>{{ 'org.status_' + o | translate }}</ng-template>
                  <ng-template #item let-o>{{ 'org.status_' + o | translate }}</ng-template>
                </p-select>
              </ui-field>
              <div class="flex justify-end gap-2">
                <button pButton severity="secondary" type="button" (click)="close()">{{ 'common.cancel' | translate }}</button>
                <button pButton type="submit" [loading]="busy()">{{ 'common.save' | translate }}</button>
              </div>
            </form>
          </ui-modal>
        }
        @case ('admin') {
          <ui-modal title="org.createAdmin" (closed)="close()">
            <p class="mb-3 text-sm text-slate-600">{{ 'org.adminHelp' | translate: { name: dlg.name } }}</p>
            <ui-api-error [error]="dialogError()" />
            <form [formGroup]="adm" (ngSubmit)="saveAdmin()" novalidate>
              <ui-field label="user.login" help="user.loginHelp" inputId="alogin" [control]="adm.controls.login" [required]="true">
                <input id="alogin" pInputText class="w-full" formControlName="login" />
              </ui-field>
              <ui-field label="user.firstName" inputId="afirst" [control]="adm.controls.firstName" [required]="true">
                <input id="afirst" pInputText class="w-full" formControlName="firstName" />
              </ui-field>
              <ui-field label="user.lastName" inputId="alast" [control]="adm.controls.lastName" [required]="true">
                <input id="alast" pInputText class="w-full" formControlName="lastName" />
              </ui-field>
              <ui-field label="user.password" help="user.passwordHelp" inputId="apass" [control]="adm.controls.password" [required]="true">
                <p-password inputId="apass" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" formControlName="password" autocomplete="new-password" />
              </ui-field>
              <div class="flex justify-end gap-2">
                <button pButton severity="secondary" type="button" (click)="close()">{{ 'common.cancel' | translate }}</button>
                <button pButton type="submit" [loading]="busy()">{{ 'common.save' | translate }}</button>
              </div>
            </form>
          </ui-modal>
        }
        @case ('delete') {
          <ui-modal title="org.deleteTitle" (closed)="close()">
            <p class="mb-4">{{ 'org.deleteConfirm' | translate: { name: dlg.name } }}</p>
            <ui-api-error [error]="dialogError()" />
            <div class="flex justify-end gap-2">
              <button pButton severity="secondary" type="button" (click)="close()">{{ 'common.cancel' | translate }}</button>
              <button pButton severity="danger" type="button" [loading]="busy()" (click)="remove(dlg.what, dlg.id)">{{ 'common.delete' | translate }}</button>
            </div>
          </ui-modal>
        }
      }
    }
  `,
})
export class OrganizationsComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly departments = inject(DepartmentService);
  private readonly api = environment.apiUrl;

  protected readonly data = signal<OrganizationOverview[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<ErrorInfo | null>(null);
  protected readonly dialogError = signal<ErrorInfo | null>(null);
  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly statuses = ['ACTIVE', 'INACTIVE'];

  protected readonly uni = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(ORG_NAME)]],
    logoUrl: ['', [Validators.maxLength(300), Validators.pattern(LOGO)]],
    country: ['', [Validators.maxLength(60), Validators.pattern(ORG_NAME)]],
    city: ['', [Validators.maxLength(60), Validators.pattern(ORG_NAME)]],
    status: ['ACTIVE'],
  });
  protected readonly dep = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(ORG_NAME)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,8}$/)]],
    logoUrl: ['', [Validators.maxLength(300), Validators.pattern(LOGO)]],
    status: ['ACTIVE'],
  });
  protected readonly adm = this.fb.group({
    login: ['', [Validators.required, Validators.pattern(LOGIN_PATTERN)]],
    firstName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
    lastName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected openUniversity(u?: OrganizationOverview): void {
    this.reset();
    this.uni.reset({
      name: u?.name ?? '',
      logoUrl: u?.logoUrl ?? '',
      country: u?.country ?? '',
      city: u?.city ?? '',
      status: u?.status ?? 'ACTIVE',
    });
    this.dialog.set({ kind: 'university', id: u?.id });
  }

  protected openDepartment(university: string, d?: OrganizationOverview['departments'][number]): void {
    this.reset();
    this.dep.reset({ name: d?.name ?? '', code: d?.code ?? '', logoUrl: d?.logoUrl ?? '', status: d?.status ?? 'ACTIVE' });
    this.dialog.set({ kind: 'department', university, id: d?.id });
  }

  protected openAdmin(department: string, name: string): void {
    this.reset();
    this.adm.reset({ login: '', firstName: '', lastName: '', password: '' });
    this.dialog.set({ kind: 'admin', department, name });
  }

  protected close(): void {
    this.dialog.set(null);
  }

  protected saveUniversity(): void {
    const dlg = this.dialog();
    if (dlg?.kind !== 'university' || !validateOrReset(this.uni)) return;
    // Empty optional fields are not sent (the API rejects empty strings)
    const body = this.clean(this.uni.getRawValue());
    this.run(
      dlg.id ? this.http.patch(`${this.api}/universities/${dlg.id}`, body) : this.http.post(`${this.api}/universities`, body),
      dlg.id ? 'universityUpdated' : 'universityCreated',
      this.uni,
    );
  }

  protected saveDepartment(): void {
    const dlg = this.dialog();
    if (dlg?.kind !== 'department' || !validateOrReset(this.dep)) return;
    const body = this.clean(this.dep.getRawValue());
    this.run(
      dlg.id
        ? this.http.patch(`${this.api}/departments/${dlg.id}`, body)
        : this.http.post(`${this.api}/departments`, { ...body, university: dlg.university }),
      dlg.id ? 'departmentUpdated' : 'departmentCreated',
      this.dep,
    );
  }

  protected saveAdmin(): void {
    const dlg = this.dialog();
    if (dlg?.kind !== 'admin' || !validateOrReset(this.adm)) return;
    this.run(this.http.post(`${this.api}/departments/${dlg.department}/admin`, this.adm.getRawValue()), 'adminCreated', this.adm);
  }

  protected remove(what: 'universities' | 'departments', id: string): void {
    this.run(this.http.delete(`${this.api}/${what}/${id}`), what === 'universities' ? 'universityDeleted' : 'departmentDeleted');
  }

  // ---------- helpers ----------

  private run(call: Observable<unknown>, toastKey: string, form?: { get(name: string): { reset(v: string): void } | null }): void {
    this.busy.set(true);
    this.dialogError.set(null);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(toastKey);
        this.close();
        this.load();
        // The selector in the header must know about the change
        void this.departments.init(this.departments.selectedId() ?? undefined);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const code = apiErrorCode(err);
        const field = code ? FIELD_ERRORS[code] : undefined;
        const control = field && form ? form.get(field) : null;
        if (control) {
          control.reset('');
          setServerError(control as never, apiErrorKey(err));
        } else {
          this.dialogError.set(toErrorInfo(err));
        }
      },
    });
  }

  private clean<T extends Record<string, string>>(value: T): Partial<T> {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '')) as Partial<T>;
  }

  private reset(): void {
    this.dialogError.set(null);
  }

  private load(): void {
    this.loading.set(true);
    this.http.get<OrganizationOverview[]>(`${this.api}/organizations`).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toErrorInfo(err));
        this.loading.set(false);
      },
    });
  }
}
