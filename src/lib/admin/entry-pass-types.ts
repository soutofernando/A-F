export type EntryGuest = {
  id: string;
  name: string;
  tableName: string | null;
  usedAt: string | null;
};

export type EntryPassCard = {
  guestId: string;
  name: string;
  tableName: string | null;
  token: string;
  usedAt: string | null;
};

export type EntryScan =
  | {
      ok: true;
      reason: 'ok';
      guestId: string;
      name: string;
      tableName: string | null;
      usedAt: string;
    }
  | {
      ok: false;
      reason: 'used';
      guestId: string;
      name: string;
      tableName: string | null;
      usedAt: string;
    }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'error' }
  | { ok: false; reason: 'unauthorized' };

export const ENTRY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
