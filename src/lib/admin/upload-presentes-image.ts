import { createClient } from '@/lib/supabase/server';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

function extFromContentType(contentType: string | null): string {
  const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/avif') return 'avif';
  return 'jpg';
}

function extFromUrl(url: string): string | null {
  const match = url.match(IMAGE_EXT);
  if (!match) return null;
  const raw = match[1].toLowerCase();
  return raw === 'jpeg' ? 'jpg' : raw;
}

function safeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'img'
  );
}

async function insertPresentesImage(
  buffer: Buffer,
  contentType: string,
  alt: string | null,
  nameHint: string,
  extHint?: string | null,
): Promise<string | null> {
  const context = 'presentes';
  const ext = extHint ?? extFromContentType(contentType);
  const storage_path = `${context}/${Date.now()}-${safeSlug(nameHint)}.${ext}`;

  const supabase = await createClient();
  const up = await supabase.storage.from('photos').upload(storage_path, buffer, {
    contentType: contentType || 'image/jpeg',
    upsert: false,
  });
  if (up.error) {
    console.error('insertPresentesImage upload', up.error);
    return null;
  }

  const { data, error } = await supabase
    .from('images')
    .insert({ context, storage_path, alt, display_order: 0 })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('insertPresentesImage insert', error);
    return null;
  }

  return data.id;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; AliciaFernandoGiftImport/1.0)',
  Accept: 'text/html,image/*,*/*;q=0.8',
};

export async function uploadPresentesImage(file: File, alt: string | null): Promise<string | null> {
  if (file.size === 0) return null;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const buffer = Buffer.from(await file.arrayBuffer());
  return insertPresentesImage(buffer, file.type || 'image/jpeg', alt, file.name, ext);
}

export async function uploadPresentesImageFromUrl(url: string, alt: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const response = await fetch(trimmed, { headers: FETCH_HEADERS, redirect: 'follow' });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 200 || buffer.length > 8_000_000) return null;
    return insertPresentesImage(buffer, contentType, alt, alt, extFromUrl(trimmed));
  } catch (error) {
    console.error('uploadPresentesImageFromUrl', error);
    return null;
  }
}

export async function discoverProductImageUrl(pageUrl: string): Promise<string | null> {
  const trimmed = pageUrl.trim();
  if (!trimmed) return null;
  if (IMAGE_EXT.test(trimmed)) return trimmed;

  try {
    const response = await fetch(trimmed, { headers: FETCH_HEADERS, redirect: 'follow' });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 250_000);
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  } catch (error) {
    console.error('discoverProductImageUrl', error);
    return null;
  }
}

export async function resolveGiftImageId(
  title: string,
  link: string | null,
  imageUrl: string | null,
  discoverFromLink: boolean,
): Promise<string | null> {
  if (imageUrl) {
    const direct = await uploadPresentesImageFromUrl(imageUrl, title);
    if (direct) return direct;
  }
  if (!discoverFromLink || !link) return null;
  const discovered = await discoverProductImageUrl(link);
  if (!discovered) return null;
  return uploadPresentesImageFromUrl(discovered, title);
}

/** New upload wins over gallery pick; empty file falls back to image_id. */
export async function resolveGiftImageIdFromForm(formData: FormData, title: string): Promise<string | null> {
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    const alt = String(formData.get('image_alt') ?? '').trim() || title;
    const uploaded = await uploadPresentesImage(file, alt);
    if (uploaded) return uploaded;
  }
  const picked = String(formData.get('image_id') ?? '').trim();
  return picked || null;
}
