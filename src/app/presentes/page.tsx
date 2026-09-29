import { GiftsBand } from '@/components/home/GiftsBand';
import { PUBLIC_GIFT_SELECT, toPublicGifts, type Gift, type GiftRow } from '@/lib/gifts';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function loadGifts(): Promise<Gift[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('gifts')
      .select(PUBLIC_GIFT_SELECT)
      .order('display_order')
      .order('title');
    if (error || !data) return [];
    return toPublicGifts(data as GiftRow[]);
  } catch {
    return [];
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
