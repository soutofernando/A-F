export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** True when query is empty or any field contains the query (accent-insensitive). */
export function matchesSearch(query: string, ...fields: string[]): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return fields.some((field) => normalizeSearchText(field).includes(q));
}
