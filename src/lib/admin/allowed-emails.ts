/** Server-only allowlist from ADMIN_EMAILS (comma-separated, lowercased). */
export function getAllowedAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

/** Blocks open redirects after auth; only paths under /admin (except login). */
export function safeAdminRedirectPath(next: string | null | undefined): string {
  const fallback = '/admin';
  if (!next || !next.startsWith('/admin') || next.startsWith('//')) return fallback;
  if (next === '/admin/login' || next.startsWith('/admin/login?')) return fallback;
  return next;
}
