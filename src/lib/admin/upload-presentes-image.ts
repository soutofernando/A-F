import { createClient } from '@/lib/supabase/server';

export async function uploadPresentesImage(file: File, alt: string | null): Promise<string | null> {
  if (file.size === 0) return null;

  const context = 'presentes';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const stamp = Date.now();
  const safeName =
    file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'img';
  const storage_path = `${context}/${stamp}-${safeName}.${ext}`;

  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from('photos').upload(storage_path, buffer, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (up.error) {
    console.error('uploadPresentesImage', up.error);
    return null;
  }

  const { data, error } = await supabase
    .from('images')
    .insert({ context, storage_path, alt, display_order: 0 })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('uploadPresentesImage insert', error);
    return null;
  }

  return data.id;
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
