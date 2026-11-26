'use client';

import { useEffect, useState } from 'react';
import { HERO_IMAGE } from '@/lib/site';

const INK = '#173B66';
const GOLD = '#8B6D38';
const CREAM = '#F8F5EE';
const BAND = '#EFE6D6';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

async function renderPoster(url: string) {
  const QRCode = (await import('qrcode')).default;
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 900,
    color: { dark: INK, light: '#ffffff' },
  });
  const [qr, mark, church] = await Promise.all([
    loadImage(dataUrl),
    loadImage('/AeF.png').catch(() => null),
    loadImage(HERO_IMAGE).catch(() => null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 2040;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const center = canvas.width / 2;

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';

  if (church) {
    const height = 520;
    const width = church.width * (height / church.height);
    ctx.drawImage(church, (canvas.width - width) / 2, 0, width, height);
    const fade = ctx.createLinearGradient(0, 340, 0, 560);
    fade.addColorStop(0, 'rgba(248,245,238,0)');
    fade.addColorStop(1, CREAM);
    ctx.fillStyle = fade;
    ctx.fillRect(0, 340, canvas.width, 220);
  }

  let y = church ? 500 : 90;
  if (mark) {
    const height = 78;
    const width = height * (mark.width / mark.height);
    ctx.drawImage(mark, (canvas.width - width) / 2, y, width, height);
    y += height + 36;
  }

  ctx.fillStyle = INK;
  ctx.font = 'italic 62px Georgia, "Times New Roman", serif';
  ctx.fillText('desafios da festa', center, y + 48);
  y += 110;

  ctx.font = 'italic 46px Georgia, "Times New Roman", serif';
  for (const line of ['Aponte a câmera para o código.', 'Coloque seu nome e entre.']) {
    ctx.fillText(line, center, y);
    y += 64;
  }

  ctx.fillStyle = GOLD;
  ctx.font = 'italic 52px Georgia, "Times New Roman", serif';
  ctx.fillText('Você recebe um desafio.', center, y + 8);
  y += 78;

  ctx.fillStyle = INK;
  ctx.font = 'italic 36px Georgia, "Times New Roman", serif';
  ctx.fillText('Depois, a galeria continua aberta.', center, y);
  y += 48;

  const qrSize = 500;
  const qx = (canvas.width - qrSize) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qx - 24, y, qrSize + 48, qrSize + 48);
  ctx.drawImage(qr, qx, y + 24, qrSize, qrSize);
  y += qrSize + 88;

  ctx.fillStyle = BAND;
  ctx.fillRect(0, y, canvas.width, canvas.height - y);
  y += 78;
  ctx.fillStyle = INK;
  ctx.font = 'italic 48px Georgia, "Times New Roman", serif';
  ctx.fillText('Coloque também as fotos', center, y);
  y += 62;
  ctx.fillText('e os vídeos da festa.', center, y);
  y += 70;
  ctx.font = 'italic 34px Georgia, "Times New Roman", serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('A galeria é de todo mundo.', center, y);
  y += 64;
  ctx.fillStyle = '#52677D';
  ctx.font = '24px Georgia, "Times New Roman", serif';
  ctx.fillText(url.replace(/^https?:\/\//, ''), center, y);

  const final = document.createElement('canvas');
  final.width = canvas.width;
  final.height = Math.ceil(y + 72);
  final.getContext('2d')?.drawImage(canvas, 0, 0);
  return final.toDataURL('image/png');
}

export function FestaQrCard({ url }: { url: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancel = false;
    renderPoster(url).then((data) => {
      if (!cancel && data) setSrc(data);
    }).catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [url]);

  const download = () => {
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = 'qr-desafios-da-festa.png';
    link.click();
  };

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      {src ? (
        <img src={src} alt="Cartaz dos desafios da festa" style={{ width: 'min(100%, 360px)', height: 'auto', background: CREAM }} />
      ) : (
        <div style={{ width: 220, height: 320 }} />
      )}
      <a href={url} style={{ color: 'var(--gold-soft)', fontSize: 14 }}>{url}</a>
      <button
        type="button"
        className="admin-btn admin-btn-gold"
        onClick={download}
        disabled={!src}
        style={{
          background: 'transparent',
          border: '1px solid var(--gold-soft)',
          color: 'var(--gold-soft)',
          padding: '11px 24px',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        baixar QR
      </button>
    </div>
  );
}
