import { GIFT_CATEGORY_IDS, type GiftCategoryId } from '@/lib/gift-categories';

export type GiftImportRow = {
  line: number;
  title: string;
  priceCents: number | null;
  link: string | null;
  category: string;
  imageUrl: string | null;
};

export type GiftImportParseError = { line: number; message: string };

const HEADER_ALIASES: Record<string, keyof Omit<GiftImportRow, 'line'>> = {
  nome: 'title',
  name: 'title',
  titulo: 'title',
  título: 'title',
  title: 'title',
  produto: 'title',
  item: 'title',
  preco: 'priceCents',
  preço: 'priceCents',
  price: 'priceCents',
  valor: 'priceCents',
  link: 'link',
  url: 'link',
  loja: 'link',
  produto_url: 'link',
  categoria: 'category',
  category: 'category',
  cat: 'category',
  imagem: 'imageUrl',
  image: 'imageUrl',
  image_url: 'imageUrl',
  foto: 'imageUrl',
  img: 'imageUrl',
};

const normalizeHeader = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

export function parsePriceToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/[R$r\s]/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && delimiter.length === 1 && ch === delimiter) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function detectDelimiter(headerLine: string): string {
  const counts: Array<[string, number]> = [
    ['\t', (headerLine.match(/\t/g) ?? []).length],
    [';', (headerLine.match(/;/g) ?? []).length],
    [',', (headerLine.match(/,/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ';';
}

function isHeaderRow(cells: string[]): boolean {
  return cells.some((cell) => {
    const key = normalizeHeader(cell);
    return key in HEADER_ALIASES;
  });
}

function resolveCategory(raw: string | undefined, defaultCategory: string): string {
  const value = (raw ?? '').trim() || defaultCategory;
  const match = GIFT_CATEGORY_IDS.find((id) => id.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

const DEFAULT_COLUMN_ORDER: Array<keyof Omit<GiftImportRow, 'line'>> = [
  'title',
  'priceCents',
  'link',
  'category',
  'imageUrl',
];

export function parseGiftImportText(
  text: string,
  defaultCategory: GiftCategoryId = 'Casa',
): { rows: GiftImportRow[]; errors: GiftImportParseError[] } {
  const errors: GiftImportParseError[] = [];
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: [{ line: 0, message: 'Nenhuma linha para importar.' }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitDelimitedLine(lines[0], delimiter);
  const hasHeader = isHeaderRow(firstCells);

  const columnMap: Array<keyof Omit<GiftImportRow, 'line'> | null> = hasHeader
    ? firstCells.map((cell) => HEADER_ALIASES[normalizeHeader(cell)] ?? null)
    : DEFAULT_COLUMN_ORDER;

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: GiftImportRow[] = [];

  dataLines.forEach((line, index) => {
    const lineNo = hasHeader ? index + 2 : index + 1;
    const cells = splitDelimitedLine(line, delimiter);
    const record: Partial<GiftImportRow> = { line: lineNo };

    columnMap.forEach((field, colIndex) => {
      if (!field || colIndex >= cells.length) return;
      const cell = cells[colIndex]?.trim() ?? '';
      if (!cell) return;
      if (field === 'priceCents') {
        record.priceCents = parsePriceToCents(cell);
      } else if (field === 'title') {
        record.title = cell;
      } else if (field === 'link') {
        record.link = cell;
      } else if (field === 'category') {
        record.category = cell;
      } else if (field === 'imageUrl') {
        record.imageUrl = cell;
      }
    });

    if (!hasHeader && cells.length >= 1 && !record.title) {
      record.title = cells[0]?.trim();
      if (cells[1]) record.priceCents = parsePriceToCents(cells[1]);
      if (cells[2]) record.link = cells[2].trim();
      if (cells[3]) record.category = cells[3].trim();
      if (cells[4]) record.imageUrl = cells[4].trim();
    }

    const title = record.title?.trim() ?? '';
    if (!title) {
      errors.push({ line: lineNo, message: 'Título vazio — linha ignorada.' });
      return;
    }

    rows.push({
      line: lineNo,
      title,
      priceCents: record.priceCents ?? null,
      link: record.link?.trim() || null,
      category: resolveCategory(record.category, defaultCategory),
      imageUrl: record.imageUrl?.trim() || null,
    });
  });

  return { rows, errors };
}
