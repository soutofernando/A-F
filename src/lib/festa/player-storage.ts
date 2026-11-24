import { cleanDisplayName, cleanToken } from '@/lib/festa/names';
import type { FestaPlayer } from '@/lib/festa/types';

const STORAGE_KEY = 'af-festa-player';

export function readPlayer(): FestaPlayer | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FestaPlayer>;
    const token = cleanToken(parsed.token);
    const displayName = cleanDisplayName(parsed.displayName);
    if (!parsed.id || !token || !displayName) return null;
    return { id: parsed.id, token, displayName };
  } catch {
    return null;
  }
}

export function writePlayer(player: FestaPlayer | null) {
  if (typeof window === 'undefined') return;
  if (!player) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}
