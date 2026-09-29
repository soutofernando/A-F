'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ClaimMethod = 'pix' | 'address' | 'in_hand';

export async function claimGift(input: {
  giftId: string;
  giverName: string;
  method: ClaimMethod;
  addressId?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const giverName = input.giverName.trim();
  if (giverName.length < 2) {
    return { ok: false, message: 'Escreva o nome de quem está dando o presente.' };
  }
  if (input.method === 'address' && !input.addressId) {
    return { ok: false, message: 'Escolha um endereço.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('claim_gift', {
    p_gift_id: input.giftId,
    p_giver_name: giverName,
    p_method: input.method,
    p_address_id: input.method === 'address' ? input.addressId : null,
  });

  if (error) {
    const raw = error.message.toLowerCase();
    if (raw.includes('unavailable')) {
      return { ok: false, message: 'Este presente acabou de ser escolhido por outra pessoa.' };
    }
    if (raw.includes('address')) {
      return { ok: false, message: 'Esse endereço não está mais disponível.' };
    }
    return { ok: false, message: 'Não foi possível registrar. Tente de novo.' };
  }

  revalidatePath('/presentes');
  revalidatePath(`/presentes/${input.giftId}`);
  revalidatePath('/');
  revalidatePath('/admin/presentes');
  return { ok: true };
}
