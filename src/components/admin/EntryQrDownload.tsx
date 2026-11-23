'use client';

import { useState } from 'react';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function downloadName(name: string) {
  const clean = name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  return `${clean || 'convidado'}.png`;
}

async function downloadEntryQr(name: string, token: string) {
  const QRCode = (await import('qrcode')).default;
  const dataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'Q',
    margin: 1,
    width: 640,
    color: { dark: '#1a140f', light: '#ffffff' },
  });
  const image = await loadImage(dataUrl);
  const pad = 56;
  const nameSize = 42;
  const lineHeight = 52;
  const width = image.width + pad * 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = `600 ${nameSize}px Georgia, "Times New Roman", serif`;
  const lines = wrapLines(ctx, name, width - pad * 2).slice(0, 3);
  canvas.width = width;
  canvas.height = image.height + pad * 2 + lines.length * lineHeight + 28;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, pad, pad);
  ctx.fillStyle = '#1a140f';
  ctx.font = `600 ${nameSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const y = image.height + pad + 16 + lineHeight * index + lineHeight / 2;
    ctx.fillText(line, canvas.width / 2, y);
  });
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = downloadName(name);
  link.click();
}

export function EntryQrDownload({ name, token }: { name: string; token: string }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await downloadEntryQr(name, token);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        style={{
          background: 'transparent',
          border: '1px solid rgba(232,197,138,.55)',
          color: 'var(--gold-soft)',
          padding: '7px 12px',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
          fontSize: 10,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          cursor: saving ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {saving ? 'gerando...' : 'baixar QR'}
      </button>
      {failed && <span style={{ fontSize: 12, color: '#e7a394' }}>tente de novo</span>}
    </span>
  );
}
