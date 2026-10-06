const TLV = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

const PHONE_DDD = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

const isValidCpf = (digits: string) => {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
    const mod = (sum * 10) % 11;
    return (mod === 10 ? 0 : mod) === Number(digits[length]);
  };
  return check(9) && check(10);
};

const nationalPhone = (digits: string) => {
  let national = digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    national = digits.slice(2);
  }
  if (national.length !== 10 && national.length !== 11) return null;
  if (!PHONE_DDD.has(national.slice(0, 2))) return null;
  if (national.length === 11 && national[2] !== '9') return null;
  if (national.length === 11 && isValidCpf(national)) return null;
  return national;
};

export type PixKeyInfo = {
  emv: string;
  copy: string;
  label: string;
  phone: boolean;
};

/** Phone keys must be E.164 (+55…). A local number makes banks reject the QR. */
export function describePixKey(raw: string): PixKeyInfo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('@') || /[a-z]/i.test(trimmed)) {
    return { emv: trimmed, copy: trimmed, label: trimmed, phone: false };
  }
  const digits = trimmed.replace(/\D/g, '');
  const national = nationalPhone(digits);
  if (!national) return { emv: trimmed, copy: trimmed, label: trimmed, phone: false };
  const e164 = `+55${national}`;
  const label =
    national.length === 11
      ? `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`
      : `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  return { emv: e164, copy: e164, label, phone: true };
}

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
  const pixKey = describePixKey(key);
  if (!pixKey) return null;

  const merchant = TLV('00', 'br.gov.bcb.pix') + TLV('01', pixKey.emv);
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
