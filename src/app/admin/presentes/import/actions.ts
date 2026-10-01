'use server';

import { revalidatePath } from 'next/cache';
import { parseGiftImportText } from '@/lib/admin/gift-import';
import { resolveGiftImageId } from '@/lib/admin/upload-presentes-image';
import type { GiftCategoryId } from '@/lib/gift-categories';
import { GIFT_CATEGORY_IDS } from '@/lib/gift-categories';
import { adminDb } from '@/lib/admin/require-admin';

export type GiftImportResult = {
  imported: number;
  skippedImages: number;
  parseErrors: { line: number; message: string }[];
  rowErrors: { line: number; title: string; message: string }[];
};

export async function importGiftsFromText(input: {
  text: string;
  defaultCategory: string;
  discoverImages: boolean;
  pixEnabled: boolean;
  cardEnabled: boolean;
}): Promise<GiftImportResult> {
  const defaultCategory = GIFT_CATEGORY_IDS.includes(input.defaultCategory as GiftCategoryId)
    ? (input.defaultCategory as GiftCategoryId)
    : 'Casa';

  const { rows, errors: parseErrors } = parseGiftImportText(input.text, defaultCategory);
  const rowErrors: GiftImportResult['rowErrors'] = [];
  let imported = 0;
  let skippedImages = 0;

  if (rows.length === 0) {
    return { imported: 0, skippedImages: 0, parseErrors, rowErrors };
  }

  const supabase = await adminDb();
  if (!supabase) {
    return { imported: 0, skippedImages: 0, parseErrors, rowErrors };
  }
  const { data: orderRow } = await supabase
    .from('gifts')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  let displayOrder = (orderRow?.display_order ?? 0) + 10;

  for (const row of rows) {
    let imageId: string | null = null;
    if (input.discoverImages || row.imageUrl) {
      imageId = await resolveGiftImageId(row.title, row.link, row.imageUrl, input.discoverImages);
      if (!imageId && (row.imageUrl || input.discoverImages)) skippedImages += 1;
    }

    const description = row.link ? row.link : null;
    const { error } = await supabase.from('gifts').insert({
      title: row.title,
      category: row.category,
      description,
      price_cents: row.priceCents,
      image_id: imageId,
      pix_enabled: input.pixEnabled,
      card_enabled: input.cardEnabled,
      display_order: displayOrder,
    });

    displayOrder += 10;

    if (error) {
      rowErrors.push({ line: row.line, title: row.title, message: 'Não foi possível salvar no banco.' });
      continue;
    }
    imported += 1;
  }

  revalidatePath('/admin/presentes');
  revalidatePath('/admin/presentes/import');
  revalidatePath('/presentes');
  revalidatePath('/');
  revalidatePath('/admin/imagens');

  return { imported, skippedImages, parseErrors, rowErrors };
}
