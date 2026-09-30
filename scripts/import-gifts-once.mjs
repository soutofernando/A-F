import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const COZINHA = [
  /panela/i,
  /copo/i,
  /pote/i,
  /assadeira/i,
  /travessa/i,
  /taça/i,
  /prato/i,
  /caneca/i,
  /utensílio/i,
  /churrasqueira/i,
  /adega/i,
  /ferro de passar/i,
  /vaporizador/i,
  /robô aspirador/i,
  /britânia/i,
  /tramontina/i,
];

function categoryFor(name) {
  return COZINHA.some((re) => re.test(name)) ? 'Cozinha' : 'Casa';
}

function safeSlug(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'gift'
  );
}

function extFrom(contentType, imageUrl) {
  const t = (contentType ?? '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  const m = imageUrl.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  return 'jpg';
}

async function uploadImage(title, imageUrl) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GiftImport/1.0)', Accept: 'image/*,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.toLowerCase().startsWith('image/')) throw new Error(`Not an image: ${contentType}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error('Image too small');
  const ext = extFrom(contentType, imageUrl);
  const storage_path = `presentes/${Date.now()}-${safeSlug(title)}.${ext}`;
  const up = await supabase.storage.from('photos').upload(storage_path, buf, {
    contentType: contentType.split(';')[0],
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await supabase
    .from('images')
    .insert({ context: 'presentes', storage_path, alt: title, display_order: 0 })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message ?? 'insert image failed');
  return data.id;
}

const items = JSON.parse(readFileSync(resolve(__dirname, 'gifts-batch.json'), 'utf8'));

const { data: orderRow } = await supabase
  .from('gifts')
  .select('display_order')
  .order('display_order', { ascending: false })
  .limit(1)
  .maybeSingle();

let order = (orderRow?.display_order ?? 0) + 10;
const report = { ok: 0, fail: [] };

for (const item of items) {
  const title = String(item.name).trim();
  const priceCents = Math.round(Number(item.price) * 100);
  const imageUrl = String(item.image_url).trim();
  try {
    let imageId = null;
    try {
      imageId = await uploadImage(title, imageUrl);
    } catch (e) {
      console.warn(`[img] ${title}: ${e.message}`);
    }
    const { error } = await supabase.from('gifts').insert({
      title,
      category: categoryFor(title),
      price_cents: priceCents,
      image_id: imageId,
      pix_enabled: true,
      card_enabled: false,
      display_order: order,
    });
    if (error) throw new Error(error.message);
    order += 10;
    report.ok += 1;
    console.log(`OK: ${title}`);
  } catch (e) {
    report.fail.push({ title, error: e.message });
    console.error(`FAIL: ${title} — ${e.message}`);
  }
}

console.log(JSON.stringify(report, null, 2));
