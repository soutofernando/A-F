'use server';

import { revalidatePath } from 'next/cache';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { ensureGuestsForNames } from '@/lib/admin/sync-confirmation-guests';

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
  const session = await assertAdminSession();
  if (!session) return;
  const { supabase } = session;

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return;

  const contact = String(formData.get('contact') ?? '').trim() || null;
  const attending = formData.get('attending') === 'on';
  const names: ConfirmationName[] = attending ? [{ name, kind: 'adult' }] : [];
  const { error } = await supabase.from('confirmations').insert({
    attending,
    party_size: names.length,
    names,
    contact,
    message: null,
  });

  if (error) return;
  await ensureGuestsForNames(
    supabase,
    names.map((entry) => entry.name),
  );
  revalidatePath('/admin/confirmacoes');
  revalidatePath('/admin/convidados');
  revalidatePath('/admin/presencas');
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

  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const { supabase } = session;
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

  const synced = await ensureGuestsForNames(
    supabase,
    clean.map((entry) => entry.name),
  );
  if (!synced.ok) {
    return { ok: false as const, error: synced.error };
  }

  revalidatePath('/admin/confirmacoes');
  revalidatePath('/admin/convidados');
  revalidatePath('/admin/presencas');
  return { ok: true as const, names: clean };
}

function revalidateGuestLists() {
  revalidatePath('/admin/presencas');
  revalidatePath('/admin/confirmacoes');
  revalidatePath('/admin/convidados');
  revalidatePath('/admin');
}

type StoredName = { name?: string; kind?: string };

/** Tira uma pessoa da pré-lista e do cadastro de convidados. */
export async function deletePresencePerson(guestId: string) {
  if (!guestId) return { ok: false as const, error: 'Pessoa inválida.' };
  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const { supabase } = session;

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('id, display_name, full_name')
    .eq('id', guestId)
    .maybeSingle();
  if (guestError) return { ok: false as const, error: guestError.message };
  if (!guest) return { ok: false as const, error: 'Pessoa não encontrada.' };

  const label = normalizePersonName(guest.full_name || guest.display_name || '');
  const { data: confirmations, error: listError } = await supabase
    .from('confirmations')
    .select('id, names');
  if (listError) return { ok: false as const, error: listError.message };

  for (const confirmation of confirmations ?? []) {
    const names = Array.isArray(confirmation.names) ? (confirmation.names as StoredName[]) : [];
    const next = names.filter((entry) => normalizePersonName(entry.name ?? '') !== label);
    if (next.length === names.length) continue;
    if (next.length === 0) {
      const { error } = await supabase.from('confirmations').delete().eq('id', confirmation.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabase
        .from('confirmations')
        .update({ names: next, party_size: next.length })
        .eq('id', confirmation.id);
      if (error) return { ok: false as const, error: error.message };
    }
  }

  const { error: deleteError } = await supabase.from('guests').delete().eq('id', guestId);
  if (deleteError) return { ok: false as const, error: deleteError.message };
  revalidateGuestLists();
  return { ok: true as const };
}

/** Apaga a pré-confirmação e todas as pessoas dessa família. */
export async function deletePresenceFamily(confirmationId: string) {
  if (!confirmationId) return { ok: false as const, error: 'Família inválida.' };
  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const { supabase } = session;

  const { data: confirmation, error: readError } = await supabase
    .from('confirmations')
    .select('id, names')
    .eq('id', confirmationId)
    .maybeSingle();
  if (readError) return { ok: false as const, error: readError.message };
  if (!confirmation) return { ok: false as const, error: 'Família não encontrada.' };

  const wanted = new Set(
    (Array.isArray(confirmation.names) ? (confirmation.names as StoredName[]) : [])
      .map((entry) => normalizePersonName(entry.name ?? ''))
      .filter(Boolean),
  );
  if (wanted.size > 0) {
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('id, display_name, full_name');
    if (guestsError) return { ok: false as const, error: guestsError.message };
    const ids = (guests ?? [])
      .filter((guest) => wanted.has(normalizePersonName(guest.full_name || guest.display_name || '')))
      .map((guest) => guest.id);
    if (ids.length > 0) {
      const { error } = await supabase.from('guests').delete().in('id', ids);
      if (error) return { ok: false as const, error: error.message };
    }
  }

  const { error } = await supabase.from('confirmations').delete().eq('id', confirmationId);
  if (error) return { ok: false as const, error: error.message };
  revalidateGuestLists();
  return { ok: true as const };
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
  const session = await assertAdminSession();
  if (!session) return;
  const { supabase } = session;

  const wanted = new Set(names.map((n) => normalizePersonName(n)).filter(Boolean));
  if (wanted.size === 0) return;
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
  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const { supabase } = session;
  const { error } = await supabase.rpc('admin_clear_all_rsvps');
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/presencas');
  revalidatePath('/admin/convidados');
  revalidatePath('/admin');
  return { ok: true as const };
}

export async function clearGuestRsvp(guestId: string) {
  if (!guestId) return { ok: false as const, error: 'Convidado inválido.' };
  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const { supabase } = session;
  const { error } = await supabase.from('rsvps').delete().eq('guest_id', guestId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/convidados');
  revalidatePath('/admin/presencas');
  revalidatePath('/admin');
  return { ok: true as const };
}

/** WhatsApp do responsável pela família, guardado no contato da pré-confirmação. */
export async function updateConfirmationWhatsapp(confirmationId: string, whatsapp: string) {
  if (!confirmationId) return { ok: false as const, error: 'Família inválida.' };
  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const clean = whatsapp.trim().replace(/\s+/g, ' ').slice(0, 40);
  const { error } = await session.supabase
    .from('confirmations')
    .update({ contact: clean || null })
    .eq('id', confirmationId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/presencas');
  revalidatePath('/admin/confirmacoes');
  return { ok: true as const };
}

/** Marca presença oficial (status "yes") de um convidado, como se tivesse confirmado na home. */
export async function confirmGuestRsvp(guestId: string) {
  if (!guestId) return { ok: false as const, error: 'Convidado inválido.' };
  const session = await assertAdminSession();
  if (!session) return { ok: false as const, error: 'Não autorizado.' };
  const { supabase } = session;
  const { error } = await supabase.rpc('submit_rsvp', {
    p_guest_id: guestId,
    p_status: 'yes',
    p_companions: 0,
    p_message: null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/convidados');
  revalidatePath('/admin/presencas');
  revalidatePath('/admin');
  return { ok: true as const };
}
