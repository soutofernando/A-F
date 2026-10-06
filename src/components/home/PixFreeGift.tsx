'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildPixPayload, describePixKey } from '@/lib/pix-brcode';
import { createClient } from '@/lib/supabase/client';

function parseBrlToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

const copyText = async (value: string) => {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(area);
  if (!copied) await navigator.clipboard.writeText(value);
};

export function PixFreeGift() {
  const [bank, setBank] = useState('');
  const [holder, setHolder] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [configReady, setConfigReady] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('config')
          .select('key, value')
          .in('key', ['pix_key', 'pix_bank', 'pix_holder']);
        if (cancelled) return;
        const map = new Map((data ?? []).map((row) => [row.key, row.value ?? '']));
        setPixKey(map.get('pix_key')?.trim() ?? '');
        setBank(map.get('pix_bank')?.trim() ?? '');
        setHolder(map.get('pix_holder')?.trim() ?? '');
      } finally {
        if (!cancelled) setConfigReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const amountCents = useMemo(() => parseBrlToCents(amountInput), [amountInput]);

  const pixKeyInfo = useMemo(() => describePixKey(pixKey), [pixKey]);

  const payload = useMemo(() => {
    if (!pixKeyInfo || amountCents == null) return null;
    return buildPixPayload({
      key: pixKeyInfo.emv,
      holder: holder || 'Alicia e Fernando',
      amountCents,
      reference: `PIX${String(Date.now()).slice(-8)}`,
    });
  }, [pixKeyInfo, holder, amountCents]);

  useEffect(() => {
    if (!payload) {
      setQrDataUrl(null);
      setQrError('');
      return;
    }
    let cancelled = false;
    setQrError('');
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(payload, {
          margin: 1,
          width: 280,
          color: { dark: '#173B66', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError('Não foi possível gerar o QR Code. Use o código copia e cola.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const amountLabel =
    amountCents != null
      ? (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null;

  const markCopied = async (id: string, value: string) => {
    try {
      await copyText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1800);
    } catch {
      setQrError('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  if (!configReady) {
    return (
      <p className="italic" style={{ color: 'var(--texto-suave)', padding: '12px 0' }}>
        Carregando…
      </p>
    );
  }

  if (!pixKey) {
    return (
      <p className="italic" style={{ color: 'var(--texto-suave)', padding: '12px 0', maxWidth: '42ch' }}>
        A chave PIX ainda não foi cadastrada. Entre em contato com os noivos.
      </p>
    );
  }

  const pixReady = Boolean(payload && amountLabel);

  return (
    <div className="gift-claim" style={{ maxWidth: 520, margin: 0, padding: '8px 0 24px' }}>
      <p className="italic gift-claim__lede" style={{ marginTop: 0 }}>
        Escolha o valor que quiser presentear. Depois é só pagar pelo app do seu banco.
      </p>

      <label className="gift-claim__name">
        <span>Valor do presente (R$)</span>
        <input
          className="field"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          placeholder="Ex.: 150,00"
          inputMode="decimal"
          autoComplete="off"
        />
      </label>

      {pixReady && payload ? (
        <section className="gift-claim__panel" style={{ width: '100%' }}>
          <p className="gift-claim__meta">
            {[bank, holder].filter(Boolean).join(' · ') || 'PIX'}
            {' · '}
            {amountLabel}
          </p>
          {qrDataUrl ? (
            <img className="gift-claim__qr" src={qrDataUrl} alt="QR Code do PIX" />
          ) : null}
          <div className="gift-claim__copyrow">
            <textarea className="gift-claim__payload" readOnly value={payload} rows={4} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => markCopied('pix', payload)}>
              {copied === 'pix' ? 'Copiado' : 'Copiar código PIX'}
            </button>
          </div>
          {pixKeyInfo?.phone ? (
            <div className="gift-claim__fallback">
              <p className="gift-claim__hint italic">
                Se o banco recusar o código, pague pela chave do telefone e informe o valor.
              </p>
              <p className="gift-claim__key">{pixKeyInfo.label}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => markCopied('pix-key', pixKeyInfo.copy)}>
                {copied === 'pix-key' ? 'Chave copiada' : 'Copiar chave'}
              </button>
            </div>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => markCopied('pix', payload)}>
            Enviar o PIX
          </button>
          <p className="gift-claim__hint italic">
            Escaneie o QR Code ou copie o código no app do banco. O valor já vem preenchido.
          </p>
        </section>
      ) : amountInput.trim() ? (
        <p className="gift-claim__hint italic">Informe um valor válido em reais.</p>
      ) : null}

      {qrError ? <p className="gift-claim__error">{qrError}</p> : null}
    </div>
  );
}
