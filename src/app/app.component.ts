import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { LanguageService } from './core/language.service';
import { BreadcrumbsComponent } from './layout/breadcrumbs.component';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';

@Component({
  selector: 'app-root',
  imports: [Toast, RouterOutlet, HeaderComponent, FooterComponent, BreadcrumbsComponent],
  template: `
    <p-toast position="top-right" />
    <div class="flex min-h-screen flex-col">
      <app-header />
      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <app-breadcrumbs />
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class AppComponent {
  constructor() {
    inject(LanguageService).init();
  }
}
