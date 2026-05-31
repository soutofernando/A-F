import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  Field,
  PageHeader,
  SelectField,
  Stat,
  SubmitButton,
  adminInputStyle,
  adminLabelStyle,
} from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

const CONTEXTS = ['hero', 'historia', 'album', 'presentes', 'cerimonia', 'outros'] as const;

function publicUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/photos/${path}`;
}

async function uploadImage(formData: FormData) {
  'use server';
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;

  const context = String(formData.get('context') ?? 'outros').trim() || 'outros';
  const alt = String(formData.get('alt') ?? '').trim() || null;
  const display_order = Number(formData.get('display_order') ?? 0) || 0;

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
    console.error('upload error', up.error);
    return;
  }

  await supabase.from('images').insert({ context, storage_path, alt, display_order });
  revalidatePath('/admin/imagens');
}

async function deleteImage(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const path = String(formData.get('path') ?? '');
  if (!id) return;
  const supabase = await createClient();
  if (path) {
    await supabase.storage.from('photos').remove([path]);
  }
  await supabase.from('images').delete().eq('id', id);
  revalidatePath('/admin/imagens');
}

type Img = {
  id: string;
  context: string;
  storage_path: string;
  alt: string | null;
  display_order: number | null;
  created_at: string;
};

export default async function ImagensPage() {
  const supabase = await createClient();
  const { data: images } = await supabase
    .from('images')
    .select('id, context, storage_path, alt, display_order, created_at')
    .order('context')
    .order('display_order')
    .order('created_at', { ascending: false });

  const list = (images ?? []) as Img[];
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  const grouped = new Map<string, Img[]>();
  list.forEach((img) => {
    const arr = grouped.get(img.context) ?? [];
    arr.push(img);
    grouped.set(img.context, arr);
  });

  return (
    <div style={{ maxWidth: 1080 }}>
      <PageHeader
        kicker="IMAGENS"
        title="galeria de fotos"
        subtitle="Cada imagem tem um contexto (onde aparece no site). Use 'alt' para descrever a foto — ajuda na acessibilidade."
      />

      <div
        className="admin-stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <Stat label="Total de imagens" value={list.length} />
        <Stat label="Contextos em uso" value={grouped.size} />
      </div>

      <Card title="Enviar nova imagem">
        <form action={uploadImage} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'block' }}>
            <span style={adminLabelStyle}>Arquivo</span>
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              className="admin-input"
              style={{ ...adminInputStyle, padding: '10px 12px' }}
            />
          </label>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <SelectField
              label="Contexto"
              name="context"
              options={[...CONTEXTS]}
              defaultValue="album"
            />
            <Field label="Ordem de exibição" name="display_order" type="number" defaultValue={0} />
          </div>

          <Field label="Texto alternativo (alt)" name="alt" placeholder="Descrição curta — ex: 'Os noivos no pôr-do-sol'" />

          <div>
            <SubmitButton variant="gold">enviar imagem</SubmitButton>
          </div>
        </form>
      </Card>

      {list.length === 0 ? (
        <Card>
          <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
            Nenhuma imagem ainda. Faça o primeiro upload acima.
          </div>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([context, imgs]) => (
          <Card key={context} title={context} subtitle={`${imgs.length} imagem(ns) neste contexto.`}>
            <div className="admin-img-grid">
              {imgs.map((img) => (
                <div key={img.id} className="admin-img-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl(baseUrl, img.storage_path)} alt={img.alt ?? ''} />
                  <div className="admin-img-tile-overlay">
                    <div className="admin-img-tile-meta">
                      {img.alt ?? <span style={{ fontStyle: 'italic', color: 'rgba(239,231,219,.5)' }}>sem alt</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: '.2em',
                          color: 'var(--gold-soft)',
                        }}
                      >
                        ORDEM {img.display_order ?? 0}
                      </span>
                      <form action={deleteImage} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={img.id} />
                        <input type="hidden" name="path" value={img.storage_path} />
                        <SubmitButton variant="danger" small>
                          excluir
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
