'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ConfirmationName = { name: string; kind: 'adult' | 'child' };

function normalizeNames(raw: ConfirmationName[]): ConfirmationName[] {
  const out: ConfirmationName[] = [];
  for (const entry of raw) {
    const name = entry.name.trim().slice(0, 120);
    if (!name) continue;
    out.push({ name, kind: entry.kind === 'child' ? 'child' : 'adult' });
  }
  return out;
}

export async function addConfirmationFamily(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return;

  const contact = String(formData.get('contact') ?? '').trim() || null;
  const attending = formData.get('attending') === 'on';
  const names: ConfirmationName[] = attending ? [{ name, kind: 'adult' }] : [];

  const supabase = await createClient();
  const { error } = await supabase.from('confirmations').insert({
    attending,
    party_size: names.length,
    names,
    contact,
    message: null,
  });

  if (error) return;
  revalidatePath('/admin/confirmacoes');
}

export async function updateConfirmationNames(
  confirmationId: string,
  attending: boolean,
  names: ConfirmationName[],
) {
  const clean = normalizeNames(names);
  if (attending && clean.length === 0) {
    return { ok: false as const, error: 'Informe ao menos um nome.' };
  }
  if (clean.length > 30) {
    return { ok: false as const, error: 'Limite de 30 pessoas por confirmação.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('confirmations')
    .update({
      names: clean,
      party_size: clean.length,
    })
    .eq('id', confirmationId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/admin/confirmacoes');
  return { ok: true as const, names: clean };
}

function normalizePersonName(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove RSVPs dos convidados cujos nomes batem com a lista (após desconfirmar no admin). */
export async function clearRsvpsForGuestNames(names: string[]) {
  const wanted = new Set(names.map((n) => normalizePersonName(n)).filter(Boolean));
  if (wanted.size === 0) return;

  const supabase = await createClient();
  const { data: guests } = await supabase.from('guests').select('id, display_name, full_name');
  const ids: string[] = [];
  for (const guest of guests ?? []) {
    const label = guest.full_name || guest.display_name;
    if (label && wanted.has(normalizePersonName(label))) ids.push(guest.id);
  }
  if (ids.length === 0) return;
  await supabase.from('rsvps').delete().in('guest_id', ids);
  revalidatePath('/admin/convidados');
  revalidatePath('/admin');
}

export async function clearAllOfficialRsvps() {
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_clear_all_rsvps');
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/presencas');
  revalidatePath('/admin/convidados');
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function clearGuestRsvp(guestId: string) {
  if (!guestId) return { ok: false as const, error: 'Convidado inválido.' };
  const supabase = await createClient();
  const { error } = await supabase.from('rsvps').delete().eq('guest_id', guestId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/convidados');
  revalidatePath('/admin');
  return { ok: true as const };
}
