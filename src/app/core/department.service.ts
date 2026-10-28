import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { DepartmentInfo, UniversityInfo } from './models';

const STORAGE_KEY = 'unigrader.department';

/**
 * The department the app is currently showing. Visitors choose it (remembered in the
 * browser); a logged-in user is put into their own department. It is sent to the API
 * as the `X-Department` header (see the interceptor).
 */
@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);

  readonly universities = signal<UniversityInfo[]>([]);
  readonly departments = signal<DepartmentInfo[]>([]);
  readonly selected = signal<DepartmentInfo | null>(null);
  readonly selectedId = computed(() => this.selected()?.id ?? null);

  /** Logo of the department, else of its university, else the default one */
  readonly logo = computed(
    () => this.selected()?.logoUrl ?? this.selected()?.university.logoUrl ?? 'logo.svg',
  );

  /** Called once at start-up (before the first page): loads the lists and picks the department */
  async init(userDepartmentId?: string): Promise<void> {
    try {
      const [universities, departments] = await Promise.all([
        firstValueFrom(this.http.get<UniversityInfo[]>(`${environment.apiUrl}/universities`)),
        firstValueFrom(this.http.get<DepartmentInfo[]>(`${environment.apiUrl}/departments`)),
      ]);
      this.universities.set(universities);
      this.departments.set(departments);
    } catch {
      return; // API down: the pages show a network error
    }
    const wanted = userDepartmentId ?? this.stored();
    const found = this.departments().find((d) => d.id === wanted);
    if (found) this.select(found);
    else if (userDepartmentId) await this.selectById(userDepartmentId);
    else if (this.departments().length) this.select(this.departments()[0]);
  }

  select(department: DepartmentInfo): void {
    this.selected.set(department);
    try {
      localStorage.setItem(STORAGE_KEY, department.id);
    } catch {
      // storage unavailable: the choice lives in memory only
    }
  }

  /** Used after login: the user's own department (it may be inactive, so it can be missing from the list) */
  async selectById(id: string): Promise<void> {
    const known = this.departments().find((d) => d.id === id);
    if (known) return this.select(known);
    try {
      this.select(await firstValueFrom(this.http.get<DepartmentInfo>(`${environment.apiUrl}/departments/${id}`)));
    } catch {
      // keep the current selection
    }
  }

  private stored(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
