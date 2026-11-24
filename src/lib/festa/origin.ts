type HeaderList = { get(name: string): string | null };

export function originFrom(headerList: HeaderList) {
  const hostHeader = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';
  const host = hostHeader.split(',')[0]?.trim() ?? '';
  const protoHeader = headerList.get('x-forwarded-proto');
  const proto = protoHeader?.split(',')[0]?.trim()
    || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  if (!host) return (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return `${proto}://${host}`;
}

export function festaPageUrl(origin: string) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const base = configured && !/localhost|127\.0\.0\.1/.test(configured) ? configured : origin;
  return `${base}/festa`;
}
