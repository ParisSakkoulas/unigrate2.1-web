import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

export type Language = (typeof environment.supportedLanguages)[number];

const STORAGE_KEY = 'unigrader.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly languages = environment.supportedLanguages;
  readonly current = signal<Language>(environment.defaultLanguage as Language);

  init(): void {
    this.translate.addLangs([...this.languages]);
    this.translate.setDefaultLang(environment.defaultLanguage);
    this.use(this.stored() ?? (environment.defaultLanguage as Language));
  }

  use(lang: Language): void {
    this.translate.use(lang);
    this.current.set(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }

  private stored(): Language | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return this.languages.includes(v as Language) ? (v as Language) : null;
    } catch {
      return null;
    }
  }
}
