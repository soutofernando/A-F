import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { beginDirectUpload, deleteDriveFile, driveIsReady, readDriveFile, shareDriveFile } from '@/lib/festa/drive';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, mediaFromName } from '@/lib/festa/media';
import { cleanDisplayName, cleanToken } from '@/lib/festa/names';
import type { FestaDraw, FestaFeedItem } from '@/lib/festa/types';

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

type PlayerRow = {
  id: string;
  token: string;
  display_name: string;
  challenge_id: string | null;
};

async function playerByToken(admin: Admin, token: string) {
  const { data } = await admin
    .from('festa_players')
    .select('id, token, display_name, challenge_id')
    .eq('token', token)
    .maybeSingle();
  return data as PlayerRow | null;
}

async function challengeById(admin: Admin, id: string) {
  const { data } = await admin
    .from('festa_challenges')
    .select('id, title, hint')
    .eq('id', id)
    .maybeSingle();
  return data as FestaDraw | null;
}

async function drawChallenge(admin: Admin, playerId: string): Promise<FestaDraw | Fail> {
  const { data: current, error: currentError } = await admin
    .from('festa_players')
    .select('challenge_id')
    .eq('id', playerId)
    .maybeSingle();
  if (currentError) return drawFailed(currentError);
  if (current?.challenge_id) {
    const saved = await challengeById(admin, current.challenge_id);
    if (saved) return saved;
  }

  const [{ data: challenges, error: challengeError }, { data: taken, error: takenError }] = await Promise.all([
    admin.from('festa_challenges').select('id, title, hint').eq('active', true),
    admin.from('festa_players').select('challenge_id').not('challenge_id', 'is', null),
  ]);
  if (challengeError) return drawFailed(challengeError);
  if (takenError) return drawFailed(takenError);

  const used = new Set((taken ?? []).map((row) => row.challenge_id).filter((id): id is string => Boolean(id)));
  const open = ((challenges ?? []) as FestaDraw[]).filter((row) => !used.has(row.id));
  if (open.length === 0) return { error: 'Os desafios desta noite já foram todos sorteados.', status: 409 };

  for (let attempt = 0; attempt < 6 && open.length > 0; attempt += 1) {
    const pick = open.splice(Math.floor(Math.random() * open.length), 1)[0];
    const { data, error } = await admin
      .from('festa_players')
      .update({ challenge_id: pick.id })
      .eq('id', playerId)
      .is('challenge_id', null)
      .select('challenge_id')
      .maybeSingle();
    if (!error && data?.challenge_id) return pick;
    if (error && error.code !== '23505') return drawFailed(error);
    const { data: again } = await admin
      .from('festa_players')
      .select('challenge_id')
      .eq('id', playerId)
      .maybeSingle();
    if (again?.challenge_id) {
      const saved = await challengeById(admin, again.challenge_id);
      if (saved) return saved;
    }
  }
  return { error: 'Não consegui sortear o desafio. Tente outra vez.', status: 500 };
}

function drawFailed(error: { message?: string; code?: string }): Fail {
  const message = error.message ?? '';
  console.error('festa draw', error.code, message);
  if (message.includes('challenge_id')) return { error: 'A brincadeira ainda está sendo preparada.', status: 500 };
  return { error: 'Não consegui sortear o desafio.', status: 500 };
}

async function withChallenge(
  admin: Admin,
  player: { id: string; token: string; display_name: string },
): Promise<{ id: string; token: string; displayName: string; challenge: FestaDraw } | Fail> {
  const challenge = await drawChallenge(admin, player.id);
  if ('error' in challenge) return challenge;
  return { id: player.id, token: player.token, displayName: player.display_name, challenge };
}

export async function joinPlayer(body: unknown): Promise<
  { id: string; token: string; displayName: string; challenge: FestaDraw } | Fail
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
      return withChallenge(admin, { ...existing, display_name: displayName });
    }
  }

  const fresh = randomBytes(24).toString('base64url');
  const { data, error } = await admin
    .from('festa_players')
    .insert({ token: fresh, display_name: displayName })
    .select('id, token, display_name')
    .single();
  if (error || !data) return { error: 'Não consegui entrar na brincadeira.', status: 500 };
  return withChallenge(admin, data);
}

export async function prepareUpload(body: unknown, origin: string): Promise<
  { uploadUrl: string; contentType: string; shared: boolean } | Fail
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
    if (player.challenge_id !== challenge.id) return { error: 'Esse não é o seu desafio.', status: 403 };
    challengeTitle = challenge.title;
    const { data: existing } = await admin
      .from('festa_submissions')
      .select('id')
      .eq('player_id', player.id)
      .eq('challenge_id', challengeId)
      .eq('kind', 'challenge')
      .maybeSingle();
    if (existing) return { error: 'Você já cumpriu o seu desafio. A galeria continua aberta.', status: 409 };
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
    return { uploadUrl: session.uploadUrl, contentType: media.contentType, shared: session.shared };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não consegui abrir o Drive.';
    return { error: message.slice(0, 300), status: 502 };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function feedItem(admin: Admin, id: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data } = await admin.from('festa_feed').select(FEED_COLUMNS).eq('id', id).maybeSingle();
    if (data) return data as FestaFeedItem;
    await wait(200 * (attempt + 1));
  }
  return null;
}

async function feedItemByFile(admin: Admin, fileId: string) {
  const { data } = await admin
    .from('festa_submissions')
    .select('id')
    .eq('drive_file_id', fileId)
    .maybeSingle();
  if (!data?.id) return null;
  return feedItem(admin, data.id);
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
  if (kind === 'challenge' && (!isUuid(challengeId) || player.challenge_id !== challengeId)) {
    return { error: 'Esse não é o seu desafio.', status: 403 };
  }

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

  const folderShared = record.folderShared === true;
  const sharePromise = folderShared
    ? Promise.resolve()
    : shareDriveFile(fileId).catch((error) => {
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
    const detail = `${error?.message ?? ''} ${error?.details ?? ''}`;
    if (error?.code === '23505' && detail.includes('drive_file_id')) {
      const existing = await feedItemByFile(admin, file.id);
      if (existing) return { item: existing };
    }
    if (error?.code === '23505' && kind === 'challenge') {
      await deleteDriveFile(fileId).catch(() => undefined);
      return { error: 'Você já cumpriu o seu desafio. A galeria continua aberta.', status: 409 };
    }
    console.error('festa commit', error?.code, error?.message);
    return { error: 'A foto está no Drive, mas não entrou na galeria.', status: 500 };
  }

  const item = await feedItem(admin, data.id);
  if (item) return { item };
  return {
    item: {
      id: data.id,
      player_id: player.id,
      display_name: player.display_name,
      kind,
      media_type: mediaType,
      drive_file_id: file.id,
      points: kind === 'challenge' ? 1 : 0,
      challenge_id: kind === 'challenge' ? challengeId : null,
      challenge_title: null,
      created_at: new Date().toISOString(),
    },
  };
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
