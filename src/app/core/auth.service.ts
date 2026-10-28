import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DepartmentService } from './department.service';
import { LoginResponse, User, ViewerRole } from './models';

interface Session {
  token: string;
  expiresAt: number;
  user: User;
}

const STORAGE_KEY = 'unigrader.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly departments = inject(DepartmentService);

  private readonly session = signal<Session | null>(this.restore());
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  /**
   * A logged-out user is a VISITOR. So is a user who looks at another department
   * than their own ("user of another department = visitor there").
   */
  readonly role = computed<ViewerRole>(() => {
    const user = this.user();
    if (!user) return 'VISITOR';
    if (user.role === 'SUPER_ADMIN') return user.role;
    const shown = this.departments.selectedId();
    return shown && user.department && shown !== user.department ? 'VISITOR' : user.role;
  });
  /** True while a logged-in user browses another department */
  readonly isForeign = computed(() => this.isLoggedIn() && this.role() === 'VISITOR');
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });

  constructor() {
    const s = this.session();
    if (s) this.scheduleExpiry(s.expiresAt);
  }

  login(login: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { login, password })
      .pipe(
        tap((res) => {
          this.setSession({ token: res.accessToken, expiresAt: res.expiresAt, user: res.user });
          // A user always lands in their own department
          if (res.user.department) void this.departments.selectById(res.user.department);
        }),
      );
  }

  /** Manual logout (button) or automatic (`expired`) */
  logout(reason?: 'expired'): void {
    if (this.session() && !reason) {
      // Best effort: the server keeps no session, so failures are irrelevant
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.clearSession();
    void this.router.navigate(reason ? ['/login'] : ['/'], {
      queryParams: reason ? { reason } : undefined,
    });
  }

  /** Keep the header in sync after the profile was edited */
  updateUser(user: User): void {
    const s = this.session();
    if (s) this.setSession({ ...s, user });
  }

  private setSession(s: Session): void {
    this.session.set(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // storage unavailable: session lives in memory only
    }
    this.scheduleExpiry(s.expiresAt);
  }

  private clearSession(): void {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private scheduleExpiry(expiresAt: number): void {
    clearTimeout(this.expiryTimer);
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      this.logout('expired');
      return;
    }
    // setTimeout overflows above ~24.8 days; sessions are far shorter
    this.expiryTimer = setTimeout(() => this.logout('expired'), Math.min(delay, 2 ** 31 - 1));
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      if (s.expiresAt <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
