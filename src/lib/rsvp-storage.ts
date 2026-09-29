export type SavedRsvp = {
  guestId: string;
  /** Título na tela (grupo ou nome principal). */
  name: string;
  /** Quem de fato confirmou presença. */
  confirmedNames: string[];
  status: 'yes' | 'no';
  at: number;
};

const KEY = 'aef-rsvp-v1';

export function readSavedRsvp(): SavedRsvp | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRsvp & { confirmedNames?: string[] };
    if (!parsed?.guestId || (parsed.status !== 'yes' && parsed.status !== 'no')) return null;
    const confirmedNames =
      Array.isArray(parsed.confirmedNames) && parsed.confirmedNames.length > 0
        ? parsed.confirmedNames
        : parsed.name
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
    return { ...parsed, confirmedNames };
  } catch {
    return null;
  }
}

export function writeSavedRsvp(entry: SavedRsvp) {
  window.localStorage.setItem(KEY, JSON.stringify(entry));
  window.dispatchEvent(new CustomEvent('aef-rsvp', { detail: entry }));
}

export function hasConfirmedPresence() {
  return readSavedRsvp()?.status === 'yes';
}

export function clearSavedRsvp() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('aef-rsvp', { detail: null }));
}
