import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth.service';
import { CardComponent } from '../../shared/ui/card.component';

import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe, CardComponent, ButtonModule],
  template: `
    <h1 class="mb-4 text-2xl font-bold">{{ 'home.title' | translate }}</h1>

    @if (auth.user(); as user) {
      <ui-card>
        <p class="mb-2">{{ 'home.welcome' | translate: { name: auth.fullName() } }}</p>
        <p class="text-sm text-slate-600">{{ 'home.role_' + user.role | translate }}</p>
        <div class="mt-4 flex flex-wrap gap-4 text-sm">
          @if (user.role !== 'SUPER_ADMIN') {
            <a routerLink="/courses" class="app-link">{{ 'nav.courses' | translate }}</a>
          }
          <a routerLink="/profile" class="app-link">{{ 'nav.profile' | translate }}</a>
          @if (user.role === 'SUPER_ADMIN') {
            <a routerLink="/super/organizations" class="app-link">{{
              'nav.organizations' | translate
            }}</a>
          }
          @if (auth.role() === 'ADMIN') {
            <a routerLink="/admin/users" class="app-link">{{ 'nav.users' | translate }}</a>
          }
        </div>
      </ui-card>
    } @else {
      <ui-card>
        <p class="mb-2">{{ 'home.visitor' | translate }}</p>
        <p class="mb-4 text-sm text-slate-600">{{ 'home.visitorHint' | translate }}</p>
        <div class="flex flex-wrap gap-4 text-sm">
          <p-button routerLink="/courses">{{ 'nav.courses' | translate }}</p-button>
          <p-button routerLink="/login">{{ 'nav.login' | translate }}</p-button>
          <p-button routerLink="/register">{{ 'nav.register' | translate }}</p-button>
        </div>
      </ui-card>
    }
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
}
