import { mediaFromFile, type FestaMedia } from '@/lib/festa/media';
import type { FestaFeedItem } from '@/lib/festa/types';

export class FestaUploadError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function permanentMessage(message: string) {
  return /já ganhou|não entendi|Entre |Escreva|Escolha um desafio|não está mais|passa de|Use uma foto|Vídeo pode|não entrou neste/i.test(message);
}

const PHOTO_EDGE = 1600;

async function shrinkImage(file: File) {
  const media = mediaFromFile(file);
  if (!media || media.mediaType !== 'image') return file;
  if (media.ext === 'gif') return file;
  if (file.size < 450_000 && (media.ext === 'jpg' || media.ext === 'webp')) return namedFile(file, media);
  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: PHOTO_EDGE,
      resizeQuality: 'medium',
    });
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > PHOTO_EDGE ? PHOTO_EDGE / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      bitmap.close();
      return namedFile(file, media);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.76));
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
  onPhase?: (phase: 'prepare' | 'send' | 'save') => void;
}) {
  const video = input.kind === 'gallery' && input.file.type.startsWith('video/');
  input.onPhase?.('prepare');
  const file = video ? input.file : await shrinkImage(input.file);
  const media = mediaFromFile(file);
  if (!media) {
    throw new FestaUploadError('Use uma foto JPG, PNG ou WEBP, ou um vídeo MP4 ou MOV.');
  }
  const named = namedFile(file, media);
  let fileId: string | null = null;
  let folderShared = false;
  let lastError = new FestaUploadError('Não consegui enviar. Tente outra vez.', true);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (!fileId) {
        input.onPhase?.('prepare');
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
        if (!prepared.ok) {
          const message = await readError(prepared);
          throw new FestaUploadError(message, prepared.status >= 500 && !permanentMessage(message));
        }
        const ticket = await prepared.json() as { uploadUrl: string; contentType: string; shared?: boolean };
        folderShared = ticket.shared === true;
        const contentType = ticket.contentType || named.type;
        input.onPhase?.('send');
        const uploaded = await fetch(ticket.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes 0-${named.size - 1}/${named.size}`,
          },
          body: named,
        });
        if (!uploaded.ok) throw new FestaUploadError('A foto não chegou ao Drive. Tente outra vez.', true);
        const saved = await uploaded.json().catch(() => null) as { id?: string } | null;
        if (!saved?.id) throw new FestaUploadError('A foto não chegou ao Drive. Tente outra vez.', true);
        fileId = saved.id;
      }

      input.onPhase?.('save');
      const committed = await fetch('/api/festa/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: input.token,
          fileId,
          kind: input.kind,
          challengeId: input.challengeId ?? null,
          folderShared,
        }),
      });
      if (!committed.ok) {
        const message = await readError(committed);
        const retryable = (committed.status >= 500 || committed.status === 429) && !permanentMessage(message);
        throw new FestaUploadError(message, retryable);
      }
      const data = await committed.json() as { item: FestaFeedItem };
      return data.item;
    } catch (error) {
      lastError = error instanceof FestaUploadError
        ? error
        : new FestaUploadError('Não consegui enviar. Tente outra vez.', true);
      if (!lastError.retryable || attempt === 2) throw lastError;
      await pause(700 * (attempt + 1) + Math.floor(Math.random() * 400));
    }
  }
  throw lastError;
}
