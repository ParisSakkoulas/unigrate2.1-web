import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map, startWith } from 'rxjs';
import { Tab, TabList, Tabs } from 'primeng/tabs';
import { AuthService } from '../core/auth.service';
import { DepartmentService } from '../core/department.service';
import { LanguageService } from '../core/language.service';
import { DepartmentSwitcherComponent } from './department-switcher.component';
import { ViewerRole } from '../core/models';
import { ButtonDirective } from 'primeng/button';

interface NavItem {
  path: string;
  label: string;
  roles: ViewerRole[];
}

const ALL: ViewerRole[] = ['VISITOR', 'STUDENT', 'TEACHER', 'ADMIN'];
const USERS: ViewerRole[] = ['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'];

// Phase 2+ adds the course / grade / statistics entries here
const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'nav.home', roles: [...ALL, 'SUPER_ADMIN'] },
  { path: '/courses', label: 'nav.courses', roles: ALL },
  { path: '/registrations', label: 'nav.registrations', roles: ['STUDENT'] },
  { path: '/statistics', label: 'nav.statistics', roles: ['STUDENT', 'TEACHER'] },
  { path: '/admin/users', label: 'nav.users', roles: ['ADMIN'] },
  { path: '/super/organizations', label: 'nav.organizations', roles: ['SUPER_ADMIN'] },
  { path: '/profile', label: 'nav.profile', roles: USERS },
  { path: '/login', label: 'nav.login', roles: ['VISITOR'] },
  { path: '/register', label: 'nav.register', roles: ['VISITOR'] },
];

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslatePipe, ButtonDirective, DepartmentSwitcherComponent, Tabs, TabList, Tab],
  template: `
    <header class="bg-brand-900 text-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <a routerLink="/" class="flex items-center gap-3 text-white no-underline" [attr.aria-label]="'nav.home' | translate">
          <img [src]="dept.logo()" alt="" class="h-10 w-10 rounded-full bg-white object-contain" width="40" height="40" />
        </a>
        <!-- Visitors choose the department here; a logged-in user is fixed to theirs (log out to change) -->
        <button type="button" class="text-left leading-tight text-white disabled:cursor-default" data-testid="dept-button"
                [disabled]="auth.isLoggedIn()"
                [attr.aria-label]="(auth.isLoggedIn() ? 'dept.locked' : 'dept.choose') | translate"
                [attr.title]="auth.isLoggedIn() ? ('dept.locked' | translate) : null" (click)="switching.set(true)">
          @if (auth.user()?.role === 'SUPER_ADMIN') {
            <span class="block text-base font-semibold">{{ 'dept.platform' | translate }}</span>
          } @else {
            <span class="block text-base font-semibold">{{ dept.selected()?.university?.name ?? ('app.university' | translate) }}</span>
            <span class="block text-xs text-brand-100">
              {{ dept.selected()?.name ?? ('app.department' | translate) }}
              @if (!auth.isLoggedIn()) {
                <i class="pi pi-chevron-down ml-1 text-[0.6rem]" aria-hidden="true"></i>
              }
            </span>
          }
        </button>

        <div class="ml-auto flex items-center gap-3">
          @if (auth.user(); as user) {
            <span class="hidden text-sm sm:inline" data-testid="user-name">
              {{ auth.fullName() }}
              <span class="ml-1 rounded bg-white/15 px-2 py-0.5 text-xs">
                {{ 'roles.' + auth.role() | translate }}
              </span>
            </span>
          } @else {
            <span class="hidden rounded bg-white/15 px-2 py-0.5 text-xs sm:inline">
              {{ 'roles.VISITOR' | translate }}
            </span>
          }

          <div class="flex overflow-hidden rounded-md border border-white/30 text-xs" role="group"
               [attr.aria-label]="'nav.language' | translate">
            @for (code of langs.languages; track code) {
              <button type="button" class="px-2 py-1 uppercase"
                      [class]="code === language() ? 'bg-white text-brand-900 font-semibold' : 'hover:bg-white/15'"
                      [attr.aria-pressed]="code === language()" (click)="langs.use(code)"
                      >{{ code }}</button>
            }
          </div>

          @if (auth.isLoggedIn()) {
            <button pButton severity="secondary" type="button" (click)="auth.logout()">
              {{ 'nav.logout' | translate }}
            </button>
          }

        </div>
      </div>

      <nav class="bg-brand-700" [attr.aria-label]="'nav.main' | translate">
        <div class="mx-auto max-w-6xl px-2">
          <p-tabs [value]="activePath()" [scrollable]="true">
            <p-tablist>
              @for (item of items(); track item.path) {
                <p-tab [value]="item.path" [routerLink]="item.path">{{ item.label | translate }}</p-tab>
              }
            </p-tablist>
          </p-tabs>
        </div>
      </nav>
    </header>
    @if (switching()) {
      <app-department-switcher (closed)="switching.set(false)" (applied)="changed()" />
    }
  `,
  styles: `
    /* PrimeNG tabs recoloured for the dark navigation bar */
    p-tabs {
      --p-tabs-tablist-background: transparent;
      --p-tabs-tablist-border-color: transparent;
      --p-tabs-tab-background: transparent;
      --p-tabs-tab-hover-background: transparent;
      --p-tabs-tab-active-background: transparent;
      --p-tabs-tab-color: #fff;
      --p-tabs-tab-hover-color: #fff;
      --p-tabs-tab-active-color: #fff;
      --p-tabs-tab-border-color: transparent;
      --p-tabs-tab-hover-border-color: rgba(255, 255, 255, 0.6);
      --p-tabs-tab-active-border-color: #fff;
      --p-tabs-active-bar-background: #fff;
      --p-tabs-nav-button-background: #1e1b4b;
      --p-tabs-nav-button-color: #fff;
      --p-tabs-nav-button-hover-color: #fff;
    }
    p-tab { text-decoration: none; }
  `,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly dept = inject(DepartmentService);
  protected readonly switching = signal(false);
  private readonly router = inject(Router);
  protected readonly langs = inject(LanguageService);
  protected readonly language = this.langs.current;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split(/[?#]/)[0]),
      startWith(this.router.url.split(/[?#]/)[0]),
    ),
    { requireSync: true },
  );

  /** The tab of the current page: the longest menu path the URL starts with ('/' only for the home page) */
  protected readonly activePath = computed(() => {
    const url = this.url();
    const hit = this.items()
      .map((i) => i.path)
      .filter((p) => (p === '/' ? url === '/' : url === p || url.startsWith(p + '/')))
      .sort((a, b) => b.length - a.length)[0];
    return hit ?? '';
  });

  /** Data of the old department must not stay on screen */
  protected changed(): void {
    void this.router.navigateByUrl('/');
  }

  protected readonly items = computed(() =>
    NAV_ITEMS.filter(
      (i) =>
        i.roles.includes(this.auth.role()) &&
        // Log in / Register make no sense for a user who is already logged in
        !(this.auth.isLoggedIn() && (i.path === '/login' || i.path === '/register')),
    ),
  );
}
