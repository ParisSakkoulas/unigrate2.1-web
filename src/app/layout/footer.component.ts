import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DepartmentService } from '../core/department.service';

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe],
  template: `
    <footer class="mt-8 border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
      {{ dept.selected()?.university?.name ?? ('app.university' | translate) }} ·
      {{ dept.selected()?.name ?? ('app.department' | translate) }} · {{ year }}
    </footer>
  `,
})
export class FooterComponent {
  protected readonly dept = inject(DepartmentService);
  protected readonly year = new Date().getFullYear();
}
