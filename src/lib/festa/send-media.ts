import { mediaFromFile, type FestaMedia } from '@/lib/festa/media';
import type { FestaFeedItem } from '@/lib/festa/types';

export class FestaUploadError extends Error {}

async function shrinkImage(file: File) {
  const media = mediaFromFile(file);
  if (!media || media.mediaType !== 'image') return file;
  if (media.ext === 'gif' || media.ext === 'heic' || media.ext === 'heif') return file;
  if (file.size < 900_000) return namedFile(file, media);
  try {
    const bitmap = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return namedFile(file, media);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return namedFile(file, media);
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' });
  } catch {
    return namedFile(file, media);
  }
}

function namedFile(file: File, media: FestaMedia) {
  if (file.name.toLowerCase().endsWith(`.${media.ext}`)) return file;
  return new File([file], `foto.${media.ext}`, { type: media.contentType });
}

async function readError(res: Response) {
  const data = await res.json().catch(() => null) as { error?: string } | null;
  return data?.error || 'Não consegui enviar. Tente outra vez.';
}

export async function sendFestaMedia(input: {
  token: string;
  file: File;
  kind: 'challenge' | 'gallery';
  challengeId?: string | null;
}) {
  const file = input.kind === 'gallery' && input.file.type.startsWith('video/')
    ? input.file
    : await shrinkImage(input.file);
  const media = mediaFromFile(file);
  if (!media) {
    throw new FestaUploadError('Use uma foto JPG, PNG ou WEBP, ou um vídeo MP4 ou MOV.');
  }
  const named = namedFile(file, media);

  try {
    const prepared = await fetch('/api/festa/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: input.token,
        kind: input.kind,
        challengeId: input.challengeId ?? null,
        fileName: named.name,
        byteSize: named.size,
      }),
    });
    if (!prepared.ok) throw new FestaUploadError(await readError(prepared));
    const ticket = await prepared.json() as { uploadUrl: string; contentType: string };
    const contentType = ticket.contentType || named.type;
    const uploaded = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes 0-${named.size - 1}/${named.size}`,
      },
      body: named,
    });
    if (!uploaded.ok) throw new FestaUploadError('A foto não chegou ao Drive. Tente outra vez.');
    const saved = await uploaded.json().catch(() => null) as { id?: string } | null;
    if (!saved?.id) throw new FestaUploadError('A foto não chegou ao Drive. Tente outra vez.');

    const committed = await fetch('/api/festa/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: input.token,
        fileId: saved.id,
        kind: input.kind,
        challengeId: input.challengeId ?? null,
      }),
    });
    if (!committed.ok) throw new FestaUploadError(await readError(committed));
    const data = await committed.json() as { item: FestaFeedItem };
    return data.item;
  } catch (error) {
    if (error instanceof FestaUploadError) throw error;
    throw new FestaUploadError('Não consegui enviar. Tente outra vez.');
  }
}
