const TLV = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

const ascii = (value: string, max: number) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .toUpperCase();

/** CRC-16/CCITT-FALSE, the checksum PIX BR Codes use. */
export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixPayload({
  key,
  holder,
  amountCents,
  city = 'BRASIL',
  reference,
}: {
  key: string;
  holder: string;
  amountCents: number | null;
  city?: string;
  reference?: string;
}) {
  const pixKey = key.trim();
  if (!pixKey) return null;

  const merchant = TLV('00', 'br.gov.bcb.pix') + TLV('01', pixKey);
  const amount = amountCents != null && amountCents > 0 ? (amountCents / 100).toFixed(2) : '';
  const txid = (reference ?? '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  const body = [
    TLV('00', '01'),
    TLV('01', '11'),
    TLV('26', merchant),
    TLV('52', '0000'),
    TLV('53', '986'),
    amount ? TLV('54', amount) : '',
    TLV('58', 'BR'),
    TLV('59', ascii(holder || 'Alicia e Fernando', 25) || 'ALICIA E FERNANDO'),
    TLV('60', ascii(city, 15) || 'BRASIL'),
    TLV('62', TLV('05', txid)),
  ].join('');

  const withCrcSlot = `${body}6304`;
  return `${withCrcSlot}${crc16(withCrcSlot)}`;
}
