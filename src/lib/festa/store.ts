import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { beginDirectUpload, deleteDriveFile, driveIsReady, readDriveFile, shareDriveFile } from '@/lib/festa/drive';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, mediaFromName } from '@/lib/festa/media';
import { cleanDisplayName, cleanToken } from '@/lib/festa/names';
import type { FestaFeedItem } from '@/lib/festa/types';

type Fail = { error: string; status: number };
type Admin = ReturnType<typeof createAdminClient>;

const FEED_COLUMNS = 'id, player_id, display_name, kind, media_type, drive_file_id, points, challenge_id, challenge_title, created_at';

function tryAdmin() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function asRecord(body: unknown) {
  return body && typeof body === 'object' ? body as Record<string, unknown> : {};
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function playerByToken(admin: Admin, token: string) {
  const { data } = await admin
    .from('festa_players')
    .select('id, token, display_name')
    .eq('token', token)
    .maybeSingle();
  return data;
}

export async function joinPlayer(body: unknown): Promise<
  { id: string; token: string; displayName: string } | Fail
> {
  const displayName = cleanDisplayName(asRecord(body).displayName);
  if (!displayName) return { error: 'Escreva seu nome, com pelo menos 2 letras.', status: 400 };

  const admin = tryAdmin();
  if (!admin) return { error: 'A festa ainda não está pronta para receber nomes.', status: 500 };

  const token = cleanToken(asRecord(body).token);
  if (token) {
    const existing = await playerByToken(admin, token);
    if (existing) {
      if (existing.display_name !== displayName) {
        const { error } = await admin
          .from('festa_players')
          .update({ display_name: displayName })
          .eq('id', existing.id);
        if (error) return { error: 'Não consegui trocar o nome.', status: 500 };
      }
      return { id: existing.id, token: existing.token, displayName };
    }
  }

  const fresh = randomBytes(24).toString('base64url');
  const { data, error } = await admin
    .from('festa_players')
    .insert({ token: fresh, display_name: displayName })
    .select('id, token, display_name')
    .single();
  if (error || !data) return { error: 'Não consegui entrar na brincadeira.', status: 500 };
  return { id: data.id, token: data.token, displayName: data.display_name };
}

export async function prepareUpload(body: unknown, origin: string): Promise<
  { uploadUrl: string; contentType: string } | Fail
> {
  const record = asRecord(body);
  const token = cleanToken(record.token);
  if (!token) return { error: 'Entre com seu nome para enviar.', status: 401 };
  const kind = record.kind === 'gallery' ? 'gallery' : record.kind === 'challenge' ? 'challenge' : null;
  if (!kind) return { error: 'Não entendi o envio.', status: 400 };

  const fileName = typeof record.fileName === 'string' ? record.fileName : '';
  const media = mediaFromName(fileName);
  if (!media) {
    return { error: 'Use uma foto JPG, PNG ou WEBP, ou um vídeo MP4 ou MOV.', status: 400 };
  }
  if (kind === 'challenge' && media.mediaType !== 'image') {
    return { error: 'Neste desafio vale uma foto. Vídeo pode ir para a galeria.', status: 400 };
  }

  const byteSize = Number(record.byteSize);
  const max = media.mediaType === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > max) {
    return {
      error: media.mediaType === 'video' ? 'Esse vídeo passa de 45 MB.' : 'Essa foto passa de 12 MB.',
      status: 400,
    };
  }

  const challengeId = typeof record.challengeId === 'string' ? record.challengeId : '';
  if (kind === 'challenge' && !isUuid(challengeId)) return { error: 'Escolha um desafio.', status: 400 };

  const admin = tryAdmin();
  if (!admin) return { error: 'A festa ainda não está pronta para receber fotos.', status: 500 };
  const player = await playerByToken(admin, token);
  if (!player) return { error: 'Entre de novo com seu nome.', status: 401 };
  if (!(await driveIsReady())) return { error: 'O Google Drive ainda não está conectado.', status: 503 };

  let challengeTitle = 'Desafio';
  if (kind === 'challenge') {
    const { data: challenge } = await admin
      .from('festa_challenges')
      .select('id, title, active')
      .eq('id', challengeId)
      .maybeSingle();
    if (!challenge?.active) return { error: 'Esse desafio não está mais na lista.', status: 404 };
    challengeTitle = challenge.title;
    const { data: existing } = await admin
      .from('festa_submissions')
      .select('id')
      .eq('player_id', player.id)
      .eq('challenge_id', challengeId)
      .eq('kind', 'challenge')
      .maybeSingle();
    if (existing) return { error: 'Você já ganhou o ponto deste desafio.', status: 409 };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const who = player.display_name.replace(/[\\/]/g, ' ');
  const driveName = kind === 'gallery'
    ? `${who} - galeria - ${stamp}.${media.ext}`
    : `${who} - ${challengeTitle} - ${stamp}.${media.ext}`;

  try {
    const session = await beginDirectUpload({
      origin,
      fileName: driveName,
      contentType: media.contentType,
      byteSize,
      folders: kind === 'gallery' ? ['Galeria'] : ['Desafios', challengeTitle],
      appProperties: {
        player: player.id,
        kind,
        challenge: kind === 'challenge' ? challengeId : '-',
      },
    });
    return { uploadUrl: session.uploadUrl, contentType: media.contentType };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não consegui abrir o Drive.';
    return { error: message.slice(0, 300), status: 502 };
  }
}

async function feedItem(admin: Admin, id: string) {
  const { data } = await admin.from('festa_feed').select(FEED_COLUMNS).eq('id', id).maybeSingle();
  return data as FestaFeedItem | null;
}

function isDriveId(value: string) {
  return /^[A-Za-z0-9_-]{10,80}$/.test(value);
}

export async function commitUpload(body: unknown): Promise<{ item: FestaFeedItem } | Fail> {
  const record = asRecord(body);
  const token = cleanToken(record.token);
  if (!token) return { error: 'Entre com seu nome para enviar.', status: 401 };
  const kind = record.kind === 'gallery' ? 'gallery' : record.kind === 'challenge' ? 'challenge' : null;
  const fileId = typeof record.fileId === 'string' ? record.fileId : '';
  if (!kind || !isDriveId(fileId)) return { error: 'Não entendi o envio.', status: 400 };

  const admin = tryAdmin();
  if (!admin) return { error: 'A festa ainda não está pronta para receber fotos.', status: 500 };
  const player = await playerByToken(admin, token);
  if (!player) return { error: 'Entre de novo com seu nome.', status: 401 };

  const challengeId = typeof record.challengeId === 'string' ? record.challengeId : '';
  if (kind === 'challenge' && !isUuid(challengeId)) return { error: 'Escolha um desafio.', status: 400 };

  let file;
  try {
    file = await readDriveFile(fileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não encontrei a foto no Drive.';
    return { error: message.slice(0, 300), status: 502 };
  }
  if (!file || file.appProperties.player !== player.id || file.appProperties.kind !== kind) {
    return { error: 'Essa foto não entrou neste envio.', status: 400 };
  }
  if (kind === 'challenge' && file.appProperties.challenge !== challengeId) {
    return { error: 'Essa foto não entrou neste desafio.', status: 400 };
  }

  const mediaType = file.mimeType.startsWith('video/') ? 'video' : file.mimeType.startsWith('image/') ? 'image' : null;
  if (!mediaType || (kind === 'challenge' && mediaType !== 'image')) {
    await deleteDriveFile(fileId).catch(() => undefined);
    return { error: 'Neste desafio vale uma foto. Vídeo pode ir para a galeria.', status: 400 };
  }
  const max = mediaType === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (!file.size || file.size > max) {
    await deleteDriveFile(fileId).catch(() => undefined);
    return {
      error: mediaType === 'video' ? 'Esse vídeo passa de 45 MB.' : 'Essa foto passa de 12 MB.',
      status: 400,
    };
  }

  const sharePromise = shareDriveFile(fileId).catch((error) => {
    console.error('festa drive share', error instanceof Error ? error.message : error);
  });

  const insertPromise = admin
    .from('festa_submissions')
    .insert({
      player_id: player.id,
      challenge_id: kind === 'challenge' ? challengeId : null,
      kind,
      media_type: mediaType,
      drive_file_id: file.id,
      drive_url: file.webViewLink,
      content_type: file.mimeType,
      byte_size: file.size,
      points: kind === 'challenge' ? 1 : 0,
    })
    .select('id')
    .single();

  const [{ data, error }] = await Promise.all([insertPromise, sharePromise]);

  if (error || !data) {
    if (error?.code === '23505' && kind === 'challenge') {
      await deleteDriveFile(fileId).catch(() => undefined);
      return { error: 'Você já ganhou o ponto deste desafio.', status: 409 };
    }
    console.error('festa commit', error?.code, error?.message);
    return { error: 'A foto está no Drive, mas não entrou no ranking.', status: 500 };
  }

  const item = await feedItem(admin, data.id);
  if (!item) return { error: 'A foto entrou no Drive, mas o ranking ainda não a viu.', status: 500 };
  return { item };
}

export async function deleteSubmission(id: string) {
  if (!isUuid(id)) return;
  const admin = tryAdmin();
  if (!admin) return;
  const { data } = await admin
    .from('festa_submissions')
    .select('drive_file_id')
    .eq('id', id)
    .maybeSingle();
  if (!data) return;
  await admin.from('festa_submissions').delete().eq('id', id);
  if (data.drive_file_id) {
    try {
      await deleteDriveFile(data.drive_file_id);
    } catch (error) {
      console.error('festa drive delete', error instanceof Error ? error.message : error);
    }
  }
}
