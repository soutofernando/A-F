export type SavedRsvp = {
  guestId: string;
  name: string;
  status: 'yes' | 'no';
  at: number;
};

const KEY = 'aef-rsvp-v1';

export function readSavedRsvp(): SavedRsvp | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRsvp;
    if (!parsed?.guestId || (parsed.status !== 'yes' && parsed.status !== 'no')) return null;
    return parsed;
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
