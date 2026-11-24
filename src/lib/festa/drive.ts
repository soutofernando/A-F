import { createSign } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const OAUTH_SCOPE = `${DRIVE_SCOPE} https://www.googleapis.com/auth/userinfo.email`;
const DEFAULT_FOLDER_ID = '1Qprx9w3J0mLXJbHTmq0peDS1eaR-BCqk';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type TokenCache = { key: string; token: string; until: number; mode: 'oauth' | 'service' };
let tokenCache: TokenCache | null = null;
const folderCache = new Map<string, string>();

export type DriveStatus = {
  mode: 'oauth' | 'service' | 'off';
  problem: string | null;
  email: string | null;
  folderUrl: string | null;
  oauthConfigured: boolean;
  connectedInDatabase: boolean;
};

function oauthEnv() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID ?? '';
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '';
  if (!id || !secret) return null;
  return { id, secret };
}

function normalizeKey(raw: string) {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function wantedFolderId() {
  const fromEnv = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  return fromEnv || DEFAULT_FOLDER_ID;
}

function folderUrlFor(id: string) {
  return `https://drive.google.com/drive/folders/${id}`;
}

function serviceAccountConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    && process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

async function settingsRow() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('festa_settings')
      .select('drive_refresh_token, drive_folder_id, drive_folder_url, drive_connected_email')
      .eq('id', 1)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function driveStatus(): Promise<DriveStatus> {
  const row = await settingsRow();
  const refresh = row?.drive_refresh_token || process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
  const oauth = oauthEnv();
  let mode: DriveStatus['mode'] = 'off';
  let problem: string | null = null;
  if (refresh && oauth) mode = 'oauth';
  else if (refresh && !oauth) {
    problem = 'O Google está autorizado, mas faltam GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.';
  } else if (serviceAccountConfigured()) mode = 'service';

  const folderId = wantedFolderId();

  return {
    mode,
    problem,
    email: row?.drive_connected_email ?? null,
    folderUrl: folderUrlFor(folderId),
    oauthConfigured: Boolean(oauth),
    connectedInDatabase: Boolean(row?.drive_refresh_token),
  };
}

export async function driveIsReady() {
  const status = await driveStatus();
  return status.mode !== 'off';
}

function formatGoogleError(body: unknown) {
  if (!body || typeof body !== 'object') return 'Falha no Google Drive';
  const record = body as { error?: { message?: string } | string; error_description?: string };
  const message = typeof record.error === 'string'
    ? record.error_description || record.error
    : record.error?.message;
  if (!message) return 'Falha no Google Drive';
  if (/quota/i.test(message)) {
    return 'A conta de serviço não tem espaço no Drive. Conecte o Gmail pelo botão, ou use um Drive compartilhado.';
  }
  return message.slice(0, 300);
}

async function readGoogle(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) throw new Error(typeof body === 'string' ? body.slice(0, 300) : formatGoogleError(body));
  return body as { id?: string; webViewLink?: string; access_token?: string; expires_in?: number; refresh_token?: string; email?: string; files?: Array<{ id?: string }> };
}

function signServiceJwt(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: email,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: now - 30,
    exp: now + 3600,
  })).toString('base64url');
  const unsigned = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey).toString('base64url')}`;
}

async function authorize(): Promise<{ token: string; mode: 'oauth' | 'service' }> {
  const row = await settingsRow();
  const refresh = row?.drive_refresh_token || process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
  const oauth = oauthEnv();
  const now = Date.now();

  if (refresh && oauth) {
    const key = `oauth:${refresh.slice(-12)}`;
    if (tokenCache && tokenCache.key === key && tokenCache.until > now) {
      return { token: tokenCache.token, mode: 'oauth' };
    }
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauth.id,
        client_secret: oauth.secret,
        refresh_token: refresh,
        grant_type: 'refresh_token',
      }),
    });
    const json = await readGoogle(res);
    if (!json.access_token) throw new Error('O Google não devolveu acesso ao Drive.');
    tokenCache = {
      key,
      token: json.access_token,
      until: now + (Number(json.expires_in) || 3000) * 1000 - 60_000,
      mode: 'oauth',
    };
    return { token: json.access_token, mode: 'oauth' };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '';
  const privateKey = normalizeKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '');
  if (email && privateKey && process.env.GOOGLE_DRIVE_FOLDER_ID) {
    const key = `sa:${email}`;
    if (tokenCache && tokenCache.key === key && tokenCache.until > now) {
      return { token: tokenCache.token, mode: 'service' };
    }
    const assertion = signServiceJwt(email, privateKey);
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    const json = await readGoogle(res);
    if (!json.access_token) throw new Error('A conta de serviço não autorizou o Drive.');
    tokenCache = {
      key,
      token: json.access_token,
      until: now + (Number(json.expires_in) || 3000) * 1000 - 60_000,
      mode: 'service',
    };
    return { token: json.access_token, mode: 'service' };
  }

  throw new Error('Drive não conectado');
}

function driveName(name: string) {
  const clean = name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 80) || 'foto';
}

function escapeQuery(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function folderAlive(token: string, id: string) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
  url.searchParams.set('fields', 'id,trashed');
  url.searchParams.set('supportsAllDrives', 'true');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return false;
  if (!res.ok) return false;
  const json = await res.json().catch(() => null) as { trashed?: boolean } | null;
  return Boolean(json && json.trashed !== true);
}

async function createFolder(token: string, name: string, parent: string | null) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parent ? { parents: [parent] } : {}),
    }),
  });
  const json = await readGoogle(res);
  if (!json.id) throw new Error('O Drive não criou a pasta.');
  return json.id;
}

async function findFolder(token: string, parent: string, name: string) {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeQuery(name)}'`,
    `'${escapeQuery(parent)}' in parents`,
    'trashed = false',
  ].join(' and ');
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'files(id)');
  url.searchParams.set('pageSize', '1');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await readGoogle(res);
  return json.files?.[0]?.id ?? null;
}

async function childFolder(token: string, parent: string, name: string) {
  const clean = driveName(name);
  const cacheKey = `${parent}:${clean}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;
  const id = (await findFolder(token, parent, clean)) ?? (await createFolder(token, clean, parent));
  folderCache.set(cacheKey, id);
  return id;
}

async function rootFolder(token: string, mode: 'oauth' | 'service') {
  const folderId = wantedFolderId();
  if (await folderAlive(token, folderId)) return folderId;
  if (mode === 'service') {
    throw new Error('A pasta do Drive não está acessível para a conta de serviço.');
  }
  throw new Error('Não consegui abrir a pasta do Drive. Conecte a conta que é dona dela.');
}

async function uploadBytes(token: string, parentId: string, name: string, bytes: Buffer, contentType: string) {
  const start = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(bytes.length),
      },
      body: JSON.stringify({ name: driveName(name), parents: [parentId] }),
    },
  );
  const session = start.headers.get('location');
  if (!start.ok || !session) {
    const text = await start.text();
    throw new Error(formatGoogleError(safeJson(text)));
  }
  const put = await fetch(session, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: new Blob([new Uint8Array(bytes)], { type: contentType }),
  });
  const json = await readGoogle(put);
  if (!json.id) throw new Error('O Drive não recebeu o arquivo.');
  return {
    fileId: json.id,
    url: json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`,
  };
}

export async function beginDirectUpload(input: {
  origin: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  folders: string[];
  appProperties: Record<string, string>;
}) {
  const auth = await authorize();
  let parent = await rootFolder(auth.token, auth.mode);
  for (const folder of input.folders) {
    parent = await childFolder(auth.token, parent, folder);
  }
  const start = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': input.contentType,
        'X-Upload-Content-Length': String(input.byteSize),
        Origin: input.origin,
      },
      body: JSON.stringify({
        name: driveName(input.fileName),
        parents: [parent],
        appProperties: input.appProperties,
      }),
    },
  );
  const uploadUrl = start.headers.get('location');
  if (!start.ok || !uploadUrl) {
    const text = await start.text();
    throw new Error(formatGoogleError(safeJson(text)));
  }
  return { uploadUrl };
}

export type DriveReceipt = {
  id: string;
  size: number;
  mimeType: string;
  appProperties: Record<string, string>;
  webViewLink: string;
};

export async function readDriveFile(fileId: string): Promise<DriveReceipt | null> {
  const auth = await authorize();
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set('fields', 'id,size,mimeType,appProperties,webViewLink');
  url.searchParams.set('supportsAllDrives', 'true');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });
  if (res.status === 404) return null;
  const json = await readGoogle(res) as {
    id?: string;
    size?: string;
    mimeType?: string;
    appProperties?: Record<string, string>;
    webViewLink?: string;
  };
  if (!json.id) return null;
  return {
    id: json.id,
    size: Number(json.size ?? 0),
    mimeType: json.mimeType ?? '',
    appProperties: json.appProperties ?? {},
    webViewLink: json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`,
  };
}

export async function shareDriveFile(fileId: string) {
  const auth = await authorize();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    },
  );
  if (res.ok || res.status === 409) return;
  const text = await res.text();
  throw new Error(formatGoogleError(safeJson(text)));
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function uploadToDrive(input: {
  bytes: Buffer;
  contentType: string;
  fileName: string;
  folders: string[];
}) {
  const auth = await authorize();
  let parent = await rootFolder(auth.token, auth.mode);
  for (const folder of input.folders) {
    parent = await childFolder(auth.token, parent, folder);
  }
  return uploadBytes(auth.token, parent, input.fileName, input.bytes, input.contentType);
}

export async function deleteDriveFile(fileId: string) {
  if (!(await driveIsReady())) return;
  const auth = await authorize();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` } },
  );
  if (res.status === 404 || res.status === 204) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatGoogleError(safeJson(text)));
  }
}

export function googleAuthUrl(origin: string, state: string) {
  const oauth = oauthEnv();
  if (!oauth) return null;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', oauth.id);
  url.searchParams.set('redirect_uri', `${origin}/api/festa/drive/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', OAUTH_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url;
}

export async function connectDriveFromCode(code: string, origin: string) {
  const oauth = oauthEnv();
  if (!oauth) return { error: 'missing-client' as const };
  const redirectUri = `${origin}/api/festa/drive/callback`;
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: oauth.id,
      client_secret: oauth.secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => null) as {
    access_token?: string;
    refresh_token?: string;
  } | null;
  const access = tokenJson?.access_token;
  const refresh = tokenJson?.refresh_token;
  if (!tokenRes.ok || !access || !refresh) return { error: 'token' as const };

  let email: string | null = null;
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (profileRes.ok) {
    const profile = await profileRes.json().catch(() => null) as { email?: string } | null;
    email = profile?.email ?? null;
  }

  const folderId = wantedFolderId();
  if (!(await folderAlive(access, folderId))) return { error: 'folder' as const };

  const admin = createAdminClient();
  const { error } = await admin.from('festa_settings').upsert({
    id: 1,
    drive_refresh_token: refresh,
    drive_folder_id: folderId,
    drive_folder_url: folderUrlFor(folderId),
    drive_connected_email: email,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: 'token' as const };
  tokenCache = null;
  folderCache.clear();
  return { error: null };
}

export async function disconnectDrive() {
  const admin = createAdminClient();
  await admin.from('festa_settings').update({
    drive_refresh_token: null,
    drive_connected_email: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  tokenCache = null;
  folderCache.clear();
}
