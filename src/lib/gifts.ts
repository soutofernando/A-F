/** Items per page on the home gifts section. */
export const GIFTS_PER_PAGE_HOME = 9;

/** Items per page on /presentes. */
export const GIFTS_PER_PAGE = 12;

export type Gift = {
  id: string | number;
  name: string;
  price: string;
  cat: string;
  taken: boolean;
  reserved: boolean;
  label: string;
  imageUrl?: string | null;
};

export type GiftRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  taken_by_name: string | null;
  card_hold_until: string | null;
  images: { storage_path: string; alt: string | null } | { storage_path: string; alt: string | null }[] | null;
};

export const PUBLIC_GIFT_SELECT =
  'id, title, description, category, price_cents, taken_by_name, card_hold_until, images(storage_path, alt)';

const formatPrice = (cents: number | null, category: string) => {
  if (cents == null) return category.toLowerCase() === 'pix' ? 'valor livre' : 'a combinar';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const imageOf = (images: GiftRow['images']) => {
  if (!images) return null;
  return Array.isArray(images) ? images[0] ?? null : images;
};

export function toPublicGifts(rows: GiftRow[], baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): Gift[] {
  return rows.map((row) => {
    const image = imageOf(row.images);
    const held = Boolean(row.card_hold_until && new Date(row.card_hold_until).getTime() > Date.now());
    const taken = Boolean(row.taken_by_name);
    return {
      id: row.id,
      name: row.title,
      price: formatPrice(row.price_cents, row.category),
      cat: row.category,
      taken: taken || held,
      reserved: !taken && held,
      label: (row.description || row.category).toUpperCase(),
      imageUrl: image?.storage_path ? `${baseUrl}/storage/v1/object/public/photos/${image.storage_path}` : null,
    };
  });
}
