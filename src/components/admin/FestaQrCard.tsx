'use client';

import { useEffect, useState } from 'react';
import { HERO_IMAGE } from '@/lib/site';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

export function FestaQrCard({ url }: { url: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancel = false;
    import('qrcode').then((QR) =>
      QR.default.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 640,
        color: { dark: '#173B66', light: '#ffffff' },
      }),
    ).then((data) => {
      if (!cancel) setSrc(data);
    }).catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [url]);

  const download = async () => {
    if (!src) return;
    const QRCode = (await import('qrcode')).default;
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 900,
      color: { dark: '#173B66', light: '#ffffff' },
    });
    const [qr, mark] = await Promise.all([loadImage(dataUrl), loadImage('/AeF.png').catch(() => null)]);
    const church = await loadImage(HERO_IMAGE).catch(() => null);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1620;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#F8F5EE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (church) {
      const height = 620;
      const width = church.width * (height / church.height);
      ctx.drawImage(church, (canvas.width - width) / 2, 0, width, height);
      const fade = ctx.createLinearGradient(0, 460, 0, 680);
      fade.addColorStop(0, 'rgba(248,245,238,0)');
      fade.addColorStop(1, '#F8F5EE');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 460, canvas.width, 220);
    }
    if (mark) {
      const height = 92;
      const width = height * (mark.width / mark.height);
      ctx.drawImage(mark, (canvas.width - width) / 2, church ? 560 : 80, width, height);
    }
    ctx.fillStyle = '#173B66';
    ctx.textAlign = 'center';
    ctx.font = 'italic 64px Georgia, "Times New Roman", serif';
    ctx.fillText('desafios da festa', canvas.width / 2, church ? 730 : 250);
    const qrSize = 620;
    const qx = (canvas.width - qrSize) / 2;
    const qy = church ? 780 : 320;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qx - 28, qy - 28, qrSize + 56, qrSize + 56);
    ctx.drawImage(qr, qx, qy, qrSize, qrSize);
    ctx.fillStyle = '#173B66';
    ctx.font = 'italic 36px Georgia, "Times New Roman", serif';
    ctx.fillText('cada foto vale 1 ponto', canvas.width / 2, qy + qrSize + 90);
    ctx.fillStyle = '#52677D';
    ctx.font = '24px Georgia, "Times New Roman", serif';
    ctx.fillText(url.replace(/^https?:\/\//, ''), canvas.width / 2, qy + qrSize + 140);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qr-desafios-da-festa.png';
    link.click();
  };

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <div style={{ background: '#fff', padding: 12 }}>
        {src ? (
          <img src={src} alt={`QR code para ${url}`} width={220} height={220} />
        ) : (
          <div style={{ width: 220, height: 220 }} />
        )}
      </div>
      <a href={url} style={{ color: 'var(--gold-soft)', fontSize: 14 }}>{url}</a>
      <button
        type="button"
        className="admin-btn admin-btn-gold"
        onClick={() => void download()}
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
