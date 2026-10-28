import { ToastService } from '../../core/toast.service';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { apiErrorKey } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { User, UserStatus } from '../../core/models';
import { AlertComponent } from '../../shared/ui/alert.component';
import { ButtonDirective } from 'primeng/button';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { UserFormModalComponent } from './user-form-modal.component';
import { UsersApi } from './users-api.service';

type Filter = 'ALL' | UserStatus;

@Component({
  selector: 'app-admin-users',
  imports: [TranslatePipe, AlertComponent, ButtonDirective, ModalComponent, SpinnerComponent, TableModule, TagModule, UserFormModalComponent],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ 'admin.title' | translate }}</h1>
      <button pButton type="button" (click)="editing.set('new')">{{ 'admin.newUser' | translate }}</button>
    </div>

    <div class="mb-4 flex flex-wrap gap-2" role="tablist">
      @for (f of filters; track f) {
        <button type="button" role="tab" [attr.aria-selected]="filter() === f"
                class="rounded-full border px-3 py-1 text-sm"
                [class]="filter() === f ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-50'"
                (click)="filter.set(f)">
          {{ 'admin.filter_' + f | translate }}
          @if (f === 'PENDING' && pendingCount() > 0) {
            <span class="ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white">{{ pendingCount() }}</span>
          }
        </button>
      }
    </div>

    @if (errorKey(); as key) {
      <ui-alert kind="error">{{ key | translate }}</ui-alert>
    }

    @if (loading()) {
      <ui-spinner />
    } @else if (visible().length === 0) {
      <p class="py-8 text-center text-slate-500">{{ 'admin.empty' | translate }}</p>
    } @else {
      <p-table [value]="visible()" [scrollable]="true" dataKey="id" styleClass="p-datatable-sm" [paginator]="visible().length > 10" [rows]="10">
        <ng-template #header>
          <tr>
            <th>{{ 'user.login' | translate }}</th>
            <th>{{ 'user.name' | translate }}</th>
            <th>{{ 'user.role' | translate }}</th>
            <th>{{ 'user.details' | translate }}</th>
            <th>{{ 'user.status' | translate }}</th>
            <th><span class="sr-only">{{ 'common.actions' | translate }}</span></th>
          </tr>
        </ng-template>
        <ng-template #body let-u>
          <tr>
            <td class="font-medium">{{ u.login }}</td>
            <td>{{ u.firstName }} {{ u.lastName }}</td>
            <td>{{ 'roles.' + u.role | translate }}</td>
            <td class="text-slate-600">
              @if (u.rank) { {{ 'ranks.' + u.rank | translate }} }
              @if (u.studentNumber) { {{ u.studentNumber }} ({{ u.admissionYear }}) }
            </td>
            <td>
              <p-tag [value]="'status.' + u.status | translate" [severity]="u.status === 'PENDING' ? 'warn' : 'success'" />
            </td>
            <td class="whitespace-nowrap text-right">
              <div class="flex justify-end gap-1">
                @if (u.status === 'PENDING') {
                  <button pButton size="small" type="button" (click)="approve(u)">{{ 'admin.approve' | translate }}</button>
                  <button pButton severity="danger" size="small" type="button" (click)="confirmReject.set(u)">{{ 'admin.reject' | translate }}</button>
                } @else {
                  <button pButton severity="secondary" size="small" type="button" (click)="editing.set(u)">{{ 'common.edit' | translate }}</button>
                  @if (u.id !== me()?.id) {
                    <button pButton severity="danger" size="small" type="button" (click)="confirmDelete.set(u)">{{ 'common.delete' | translate }}</button>
                  }
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }

    @if (editing(); as e) {
      <app-user-form-modal [user]="e === 'new' ? null : e" (saved)="saved()" (closed)="editing.set(null)" />
    }

    @if (confirmDelete(); as u) {
      <ui-modal title="admin.deleteTitle" (closed)="confirmDelete.set(null)">
        <p class="mb-4">{{ 'admin.deleteConfirm' | translate: { login: u.login } }}</p>
        <div class="flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="confirmDelete.set(null)">{{ 'common.cancel' | translate }}</button>
          <button pButton severity="danger" type="button" (click)="remove(u)">{{ 'common.delete' | translate }}</button>
        </div>
      </ui-modal>
    }

    @if (confirmReject(); as u) {
      <ui-modal title="admin.rejectTitle" (closed)="confirmReject.set(null)">
        <p class="mb-4">{{ 'admin.rejectConfirm' | translate: { login: u.login } }}</p>
        <div class="flex justify-end gap-2">
          <button pButton severity="secondary" type="button" (click)="confirmReject.set(null)">{{ 'common.cancel' | translate }}</button>
          <button pButton severity="danger" type="button" (click)="reject(u)">{{ 'admin.reject' | translate }}</button>
        </div>
      </ui-modal>
    }
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly api = inject(UsersApi);
  protected readonly me = inject(AuthService).user;

  protected readonly filters: Filter[] = ['ALL', 'PENDING', 'ACTIVE'];
  protected readonly users = signal<User[]>([]);
  protected readonly filter = signal<Filter>('ALL');
  protected readonly loading = signal(true);
  protected readonly errorKey = signal<string | null>(null);
  /** 'new' = create dialog, a User = edit dialog */
  protected readonly editing = signal<User | 'new' | null>(null);
  protected readonly confirmDelete = signal<User | null>(null);
  protected readonly confirmReject = signal<User | null>(null);

  protected readonly pendingCount = computed(
    () => this.users().filter((u) => u.status === 'PENDING').length,
  );
  protected readonly visible = computed(() =>
    this.users().filter((u) => this.filter() === 'ALL' || u.status === this.filter()),
  );

  ngOnInit(): void {
    this.load();
  }

  protected saved(): void {
    this.editing.set(null);
    this.load();
  }

  protected approve(u: User): void {
    this.run(this.api.approve(u.id), 'userApproved');
  }

  protected reject(u: User): void {
    this.confirmReject.set(null);
    this.run(this.api.reject(u.id), 'userRejected');
  }

  protected remove(u: User): void {
    this.confirmDelete.set(null);
    this.run(this.api.remove(u.id), 'userDeleted');
  }

  private run(action: Observable<unknown>, toastKey: string): void {
    this.errorKey.set(null);
    action.subscribe({
      next: () => {
        this.toast.success(toastKey);
        this.load();
      },
      error: (err: unknown) => this.errorKey.set(apiErrorKey(err)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.errorKey.set(apiErrorKey(err));
        this.loading.set(false);
      },
    });
  }
}
