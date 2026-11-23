'use client';

import { useState } from 'react';
import { HERO_IMAGE } from '@/lib/site';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

function entryFont(size: number) {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-serif').trim();
  return `500 ${size}px ${family || 'Georgia'}, Georgia, "Times New Roman", serif`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
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
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 720,
    color: { dark: '#1a140f', light: '#ffffff' },
  });
  const [qr, church] = await Promise.all([loadImage(dataUrl), loadImage(HERO_IMAGE)]);
  const font = entryFont(52);
  await document.fonts.load(font).catch(() => undefined);

  const width = 1080;
  const churchHeight = 1120;
  const qrSize = 560;
  const platePad = 36;
  const plateSize = qrSize + platePad * 2;
  const plateY = 960;
  const lineHeight = 64;
  const nameGap = 36;
  const bottom = 72;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = font;
  const lines = wrapLines(ctx, name, plateSize - 48).slice(0, 3);
  const nameBlock = lines.length * lineHeight;
  canvas.width = width;
  canvas.height = plateY + plateSize + nameGap + nameBlock + bottom;

  ctx.fillStyle = '#F8F5EE';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const churchWidth = church.width * (churchHeight / church.height);
  ctx.drawImage(church, (width - churchWidth) / 2, 0, churchWidth, churchHeight);

  const fadeTop = 900;
  const fadeBottom = 1160;
  const fade = ctx.createLinearGradient(0, fadeTop, 0, fadeBottom);
  fade.addColorStop(0, 'rgba(248, 245, 238, 0)');
  fade.addColorStop(1, '#F8F5EE');
  ctx.fillStyle = fade;
  ctx.fillRect(0, fadeTop, width, fadeBottom - fadeTop);
  ctx.fillStyle = '#F8F5EE';
  ctx.fillRect(0, fadeBottom, width, canvas.height - fadeBottom);

  const plateX = (width - plateSize) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(26, 20, 15, 0.16)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, plateX, plateY, plateSize, plateSize, 28);
  ctx.fillStyle = '#FFFCFA';
  ctx.fill();
  ctx.restore();
  ctx.drawImage(qr, plateX + platePad, plateY + platePad, qrSize, qrSize);

  ctx.fillStyle = '#1a140f';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nameTop = plateY + plateSize + nameGap;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, nameTop + lineHeight * index + lineHeight / 2);
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
