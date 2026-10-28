import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { AuthService } from './auth.service';
import { DepartmentService } from './department.service';
import { MyRegistration } from './models';

/** Creates the student's PDF with the browser (pdfmake is loaded only when the button is used) */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly departments = inject(DepartmentService);

  /** "My registrations and grades": every registration; grades only when the teacher has published them */
  async registrationsAndGrades(rows: MyRegistration[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>): string => this.translate.instant(key, params);
    const user = this.auth.user();
    const dept = this.departments.selected();
    const passed = rows.filter((r) => r.passed).length;

    const head: TableCell[] = [t('courses.name'), t('grades.theory'), t('grades.lab'), t('grades.final'), t('grades.result')].map(
      (text, i) => ({ text, bold: true, fillColor: '#e2e8f0', alignment: i >= 1 && i <= 3 ? 'right' : 'left' }),
    );

    // One block per semester, newest first
    const terms = new Map<string, MyRegistration[]>();
    for (const r of [...rows].sort((a, b) => b.year - a.year || b.semester - a.semester || a.courseName.localeCompare(b.courseName))) {
      const key = `${r.year}-${r.semester}`;
      terms.set(key, [...(terms.get(key) ?? []), r]);
    }
    const groups: Content[] = [...terms.values()].map((list) => {
      const first = list[0];
      const body: TableCell[][] = list.map((r) => {
        const grade = (v?: number): string => (r.gradesPublished ? (v?.toString() ?? '–') : '');
        return [
          r.courseName,
          { text: grade(r.theoryGrade), alignment: 'right' },
          { text: grade(r.labGrade), alignment: 'right' },
          { text: grade(r.finalGrade), alignment: 'right', bold: true },
          r.gradesPublished ? t(r.passed ? 'grades.passed' : 'grades.failed') : t('grades.pending'),
        ];
      });
      return {
        unbreakable: false,
        stack: [
          { text: `${first.year}–${first.year + 1} · ${t('courses.semester_' + first.semester)}`, style: 'term' },
          { table: { headerRows: 1, widths: ['*', 50, 50, 50, 70], body: [head, ...body] }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 12] },
        ],
      } as Content;
    });

    const info: Content[] = [
      { text: t('registrations.mine'), style: 'title' },
      { text: [{ text: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(), bold: true }, user?.studentNumber ? `  (${t('user.studentNumber')}: ${user.studentNumber})` : ''] },
      { text: [dept?.university?.name, dept?.name].filter(Boolean).join(' · '), color: '#475569' },
      { text: new Date().toLocaleDateString(this.translate.currentLang === 'el' ? 'el-GR' : 'en-GB'), color: '#475569', margin: [0, 0, 0, 12] },
    ];

    const doc: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { fontSize: 10 },
      styles: {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
        term: { fontSize: 12, bold: true, color: '#1e3a8a', margin: [0, 6, 0, 4] },
      },
      content: [
        ...info,
        ...(rows.length === 0 ? [{ text: t('registrations.noneMine') } as Content] : groups),
        { text: t('registrations.passedCount', { n: passed }), margin: [0, 4, 0, 0] },
      ],
    };

    const [pdfMake, fonts] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
    // The font bundle is a CommonJS module: its shape depends on how the bundler wraps it
    const f = fonts as unknown as { pdfMake?: { vfs: Record<string, string> }; default?: { pdfMake?: { vfs: Record<string, string> } } };
    const maker = ((pdfMake as unknown as { default?: unknown }).default ?? pdfMake) as {
      vfs: Record<string, string>;
      createPdf(d: TDocumentDefinitions): { download(name: string): void };
    };
    maker.vfs = f.pdfMake?.vfs ?? f.default?.pdfMake?.vfs ?? (f as unknown as Record<string, string>);
    maker.createPdf(doc).download('registrations-and-grades.pdf');
  }
}
