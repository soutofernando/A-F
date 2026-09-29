import { GiftsBand, type Gift } from '@/components/home/GiftsBand';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type GiftRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  taken_by_name: string | null;
  images: { storage_path: string; alt: string | null } | { storage_path: string; alt: string | null }[] | null;
};

const formatPrice = (cents: number | null, category: string) => {
  if (cents == null) return category.toLowerCase() === 'pix' ? 'valor livre' : 'a combinar';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const imageOf = (images: GiftRow['images']) => {
  if (!images) return null;
  return Array.isArray(images) ? images[0] ?? null : images;
};

async function loadGifts(): Promise<Gift[] | undefined> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('gifts')
      .select('id, title, description, category, price_cents, taken_by_name, images(storage_path, alt)')
      .order('display_order')
      .order('title');
    if (error || !data?.length) return undefined;

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    return (data as GiftRow[]).map((row) => {
      const image = imageOf(row.images);
      return {
        id: row.id,
        name: row.title,
        price: formatPrice(row.price_cents, row.category),
        cat: row.category,
        taken: Boolean(row.taken_by_name),
        label: (row.description || row.category).toUpperCase(),
        imageUrl: image?.storage_path ? `${baseUrl}/storage/v1/object/public/photos/${image.storage_path}` : null,
      };
    });
  } catch {
    return undefined;
  }
}

export default async function PresentesPage() {
  const gifts = await loadGifts();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 72 }}>
      <GiftsBand
        gifts={gifts}
        heading="lista de presentes"
        lede="sua presença já é, de longe, o melhor presente — mas se quiser nos ajudar a começar, deixamos alguns desejos por aqui."
      />
    </div>
  );
}
