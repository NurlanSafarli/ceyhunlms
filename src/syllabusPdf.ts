import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Course } from './data';

type Options = { course: Course; brand: string; phone: string; t: (text: string) => string };
export async function downloadSyllabusPdf({ course, brand, phone, t }: Options) {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`);
  if (!response.ok) throw new Error('Font unavailable');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await response.arrayBuffer(), { subset: true });
  pdf.setTitle(`${brand} — ${t(course.name)} — ${t('Sillabus')}`);
  pdf.setAuthor(brand);
  pdf.setSubject(t(course.description));
  const ink = rgb(0.14, 0.2, 0.28),
    blue = rgb(47 / 255, 99 / 255, 216 / 255);
  const width = 595.28,
    height = 841.89,
    margin = 48,
    usable = width - margin * 2;
  let page = pdf.addPage([width, height]),
    y = height - margin;
  const supported = new Set(font.getCharacterSet());
  const clean = (value: string) =>
    Array.from(value.replace(/\t/g, '  '))
      .map((c) => (c === '\n' || supported.has(c.codePointAt(0)!) ? c : '?'))
      .join('');
  function paragraph(value: string, size = 10, color = ink, gap = 10) {
    const leading = size * 1.55;
    function line(text: string) {
      if (y - leading < margin + 20) {
        page = pdf.addPage([width, height]);
        y = height - margin;
      }
      y -= leading;
      page.drawText(text, { x: margin, y, size, font, color });
    }
    for (const source of clean(value).split('\n')) {
      let current = '';
      for (const word of source.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= usable) {
          current = candidate;
          continue;
        }
        if (current) line(current);
        current = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(current + char, size) > usable) {
            line(current);
            current = '';
          }
          current += char;
        }
      }
      line(current);
    }
    y -= gap;
  }
  paragraph(brand, 17, blue, 3);
  paragraph('INNOVATE | EDUCATE | INTEGRATE', 7, rgb(253 / 255, 106 / 255, 2 / 255), 18);
  paragraph(`${t(course.name)} — ${t('Sillabus')}`, 20, blue);
  paragraph(`${t(course.duration)} · ${t(course.level)}`, 11);
  paragraph(`${t('İlkin biliklər')}: ${t(course.prerequisites)}`);
  course.modules.forEach((module, i) => {
    if (y < margin + 110) {
      page = pdf.addPage([width, height]);
      y = height - margin;
    }
    paragraph(`${i + 1}. ${t(module.title)} (${t(module.duration)})`, 12, blue, 5);
    module.topics.forEach((topic) => paragraph(`• ${t(topic)}`, 10, ink, 2));
    paragraph(`${t('Praktika')}: ${t(module.lab)}`, 10, ink, 16);
  });
  paragraph(`${t('Nəticə')}: ${t(course.outcome)}`, 11);
  paragraph(`${t('Əlaqə')}: ${phone}`, 11, blue);
  paragraph(t('Qrupun dəqiq cədvəli qeydiyyatdan sonra dəqiqləşdirilir.'), 9);
  pdf.getPages().forEach((sheet, i, pages) => {
    sheet.drawLine({
      start: { x: margin, y: 43 },
      end: { x: width - margin, y: 43 },
      color: blue,
      thickness: 0.5,
    });
    sheet.drawText(`${i + 1} / ${pages.length}`, {
      x: width - margin - 35,
      y: 28,
      size: 8,
      font,
      color: ink,
    });
  });
  const bytes = await pdf.save();
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `jayhun-tech-${course.id}-sillabus.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
