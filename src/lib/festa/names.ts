export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001F]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 40) return null;
  if (!/\p{L}/u.test(name)) return null;
  return name;
}

export function cleanToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const token = raw.trim();
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(token)) return null;
  return token;
}

export function pontosLabel(points: number) {
  return points === 1 ? '1 ponto' : `${points} pontos`;
}
