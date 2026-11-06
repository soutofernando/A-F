export type FamilyPdfRow = {
  family: string;
  members: string;
  going: string;
  whatsapp: string;
};

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN_X = 32;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 32;
const COLS = [
  { title: 'Família', width: 92 },
  { title: 'Integrantes', width: 430 },
  { title: 'Vão', width: 52 },
  { title: 'WhatsApp', width: 204 },
] as const;

const WIN_ANSI: Record<string, number> = {
  á: 0xe1, à: 0xe0, â: 0xe2, ã: 0xe3, ä: 0xe4,
  é: 0xe9, è: 0xe8, ê: 0xea, ë: 0xeb,
  í: 0xed, ì: 0xec, î: 0xee, ï: 0xef,
  ó: 0xf3, ò: 0xf2, ô: 0xf4, õ: 0xf5, ö: 0xf6,
  ú: 0xfa, ù: 0xf9, û: 0xfb, ü: 0xfc,
  ç: 0xe7, ñ: 0xf1,
  Á: 0xc1, À: 0xc0, Â: 0xc2, Ã: 0xc3, Ä: 0xc4,
  É: 0xc9, È: 0xc8, Ê: 0xca, Ë: 0xcb,
  Í: 0xcd, Ì: 0xcc, Î: 0xce, Ï: 0xcf,
  Ó: 0xd3, Ò: 0xd2, Ô: 0xd4, Õ: 0xd5, Ö: 0xd6,
  Ú: 0xda, Ù: 0xd9, Û: 0xdb, Ü: 0xdc,
  Ç: 0xc7, Ñ: 0xd1,
  º: 0xba, ª: 0xaa,
  '—': 0x97, '–': 0x96,
};

function charUnits(ch: string) {
  if (ch === ' ') return 280;
  if ('ilíìîï'.includes(ch)) return 280;
  if ('mwMW'.includes(ch)) return 900;
  if (ch === ch.toUpperCase() && /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(ch)) return 720;
  return 560;
}

function textWidth(text: string, size: number) {
  let units = 0;
  for (const ch of text) units += charUnits(ch);
  return (units * size) / 1000;
}

function wrap(text: string, maxWidth: number, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['—'];
  const lines: string[] = [];
  let line = '';
  const pushWord = (word: string) => {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size) > maxWidth) {
      lines.push(line);
      line = word;
      return;
    }
    line = next;
  };
  for (const word of words) {
    if (textWidth(word, size) <= maxWidth) {
      pushWord(word);
      continue;
    }
    let chunk = '';
    for (const ch of word) {
      const next = chunk + ch;
      if (chunk && textWidth(next, size) > maxWidth) {
        pushWord(chunk);
        chunk = ch;
      } else {
        chunk = next;
      }
    }
    if (chunk) pushWord(chunk);
  }
  if (line) lines.push(line);
  return lines;
}

function pdfString(value: string) {
  let out = '(';
  for (const ch of value) {
    const code = ch.charCodeAt(0) < 128 ? ch.charCodeAt(0) : WIN_ANSI[ch];
    const byte = code ?? 0x3f;
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += `\\${String.fromCharCode(byte)}`;
    else if (byte < 32 || byte > 126) out += `\\${byte.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(byte);
  }
  return `${out})`;
}

type Page = string[];

function drawText(page: Page, text: string, x: number, y: number, font: 'F1' | 'F2', size: number, color: [number, number, number]) {
  page.push(
    `${color[0]} ${color[1]} ${color[2]} rg`,
    'BT',
    `/${font} ${size} Tf`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `${pdfString(text)} Tj`,
    'ET',
  );
}

export function buildFamilyListPdf(rows: FamilyPdfRow[], generatedAt: string) {
  const pages: Page[] = [];
  const tableW = COLS.reduce((sum, col) => sum + col.width, 0);
  const fontSize = 9;
  const lineH = 12;
  const pad = 5;
  const headerH = 22;

  const startPage = () => {
    const page: Page = [];
    pages.push(page);
    drawText(page, 'Famílias e WhatsApp', MARGIN_X, PAGE_H - MARGIN_TOP, 'F2', 16, [0.15, 0.12, 0.1]);
    drawText(page, generatedAt, MARGIN_X, PAGE_H - MARGIN_TOP - 16, 'F1', 9, [0.4, 0.38, 0.34]);
    const headerTop = PAGE_H - MARGIN_TOP - 28;
    page.push('0.15 0.12 0.10 rg', `${MARGIN_X} ${(headerTop - headerH).toFixed(2)} ${tableW} ${headerH} re f`);
    let x = MARGIN_X;
    for (const col of COLS) {
      drawText(page, col.title, x + pad, headerTop - 15, 'F2', 9, [0.91, 0.8, 0.55]);
      x += col.width;
    }
    return { page, y: headerTop - headerH };
  };

  let current = startPage();

  rows.forEach((row, index) => {
    const cells = [row.family, row.members, row.going, row.whatsapp || '—'].map((value, colIndex) =>
      wrap(value, COLS[colIndex].width - pad * 2, fontSize),
    );
    const lines = Math.max(...cells.map((cell) => cell.length));
    const rowH = lines * lineH + pad * 2;
    if (current.y - rowH < MARGIN_BOTTOM + 16) current = startPage();

    const top = current.y;
    if (index % 2 === 0) {
      current.page.push(
        '0.96 0.94 0.91 rg',
        `${MARGIN_X} ${(top - rowH).toFixed(2)} ${tableW} ${rowH} re f`,
      );
    }
    current.page.push(
      '0.75 0.72 0.66 RG',
      '0.4 w',
      `${MARGIN_X} ${(top - rowH).toFixed(2)} ${tableW} ${rowH} re S`,
    );

    let x = MARGIN_X;
    cells.forEach((cell, colIndex) => {
      cell.forEach((line, lineIndex) => {
        drawText(
          current.page,
          line,
          x + pad,
          top - pad - fontSize - lineIndex * lineH,
          'F1',
          fontSize,
          [0.15, 0.12, 0.1],
        );
      });
      x += COLS[colIndex].width;
    });
    current.y = top - rowH;
  });

  if (rows.length === 0) {
    drawText(current.page, 'Nenhuma família na lista.', MARGIN_X, current.y - 24, 'F1', 11, [0.4, 0.38, 0.34]);
  }

  pages.forEach((page, index) => {
    drawText(
      page,
      `${index + 1} / ${pages.length}`,
      PAGE_W - MARGIN_X - 36,
      16,
      'F1',
      8,
      [0.4, 0.38, 0.34],
    );
  });

  const objects: string[] = [];
  const pageIds: number[] = [];
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  pages.forEach((_, index) => pageIds.push(3 + index * 2));
  objects.push(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);

  pages.forEach((page, index) => {
    const content = page.join('\n');
    const contentId = 4 + index * 2;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`);
  });

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
