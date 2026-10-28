import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { filter, merge, startWith } from 'rxjs';

interface Crumb {
  label: string;
  url: string;
}

/** Built from `data: { breadcrumb: 'translation.key' }` on the routes; rendered by PrimeNG's Breadcrumb */
@Component({
  selector: 'app-breadcrumbs',
  imports: [Breadcrumb],
  template: `
    @if (items().length > 0) {
      <p-breadcrumb [model]="items()" [home]="home()" styleClass="mb-4 !px-0 !bg-transparent" />
    }
  `,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  protected readonly crumbs = signal<Crumb[]>([]);

  /** Changes whenever the language or its texts change, so the labels are re-translated */
  private readonly texts = toSignal(
    merge(this.translate.onLangChange, this.translate.onTranslationChange).pipe(startWith(null)),
  );

  private readonly label = (key: string): string => {
    this.texts();
    return this.translate.instant(key);
  };

  protected readonly home = computed<MenuItem>(() => ({
    icon: 'pi pi-home',
    routerLink: '/',
    ariaLabel: this.label('nav.home'),
  }));

  /** Home is the icon; the rest are the crumbs. Nothing is shown on the home page itself. */
  protected readonly items = computed<MenuItem[]>(() =>
    this.crumbs().length > 1
      ? this.crumbs()
          .slice(1)
          .map((c) => ({ label: this.label(c.label), routerLink: c.url }))
      : [],
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.crumbs.set(this.build()));
  }

  private build(): Crumb[] {
    const crumbs: Crumb[] = [{ label: 'nav.home', url: '/' }];
    let url = '';
    let node: ActivatedRoute | null = this.route.root;
    while ((node = node.firstChild)) {
      const segment = node.snapshot.url.map((s) => s.path).join('/');
      if (segment) url += `/${segment}`;
      const label = node.snapshot.data['breadcrumb'] as string | undefined;
      // Parent and empty-path child share a URL: show it once
      if (label && url && crumbs[crumbs.length - 1].url !== url) crumbs.push({ label, url });
    }
    return crumbs;
  }
}
