'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { disconnectDrive } from '@/lib/festa/drive';
import { deleteSubmission } from '@/lib/festa/store';

function refresh() {
  revalidatePath('/admin/festa');
  revalidatePath('/festa');
}

function cleanTitle(raw: FormDataEntryValue | null) {
  const title = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (title.length < 2 || title.length > 80) return null;
  return title;
}

function cleanHint(raw: FormDataEntryValue | null) {
  const hint = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!hint) return null;
  return hint.slice(0, 200);
}

export async function createChallenge(formData: FormData) {
  const session = await assertAdminSession();
  if (!session) return;
  const title = cleanTitle(formData.get('title'));
  if (!title) return;
  const hint = cleanHint(formData.get('hint'));
  const sort = Number(formData.get('sort_order'));
  const { error } = await session.supabase.from('festa_challenges').insert({
    title,
    hint,
    sort_order: Number.isFinite(sort) ? sort : 0,
    active: true,
  });
  if (error) return;
  refresh();
}

export async function updateChallenge(formData: FormData) {
  const session = await assertAdminSession();
  if (!session) return;
  const id = String(formData.get('id') ?? '');
  const title = cleanTitle(formData.get('title'));
  if (!id || !title) return;
  const hint = cleanHint(formData.get('hint'));
  const sort = Number(formData.get('sort_order'));
  await session.supabase.from('festa_challenges').update({
    title,
    hint,
    sort_order: Number.isFinite(sort) ? sort : 0,
    active: formData.get('active') === 'on',
  }).eq('id', id);
  refresh();
}

export async function removeChallenge(formData: FormData) {
  const session = await assertAdminSession();
  if (!session) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { count } = await session.supabase
    .from('festa_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', id);
  if ((count ?? 0) > 0) {
    await session.supabase.from('festa_challenges').update({ active: false }).eq('id', id);
    refresh();
    redirect('/admin/festa?aviso=oculto');
  }
  await session.supabase.from('festa_challenges').delete().eq('id', id);
  refresh();
}

export async function removeSubmissionAction(formData: FormData) {
  const session = await assertAdminSession();
  if (!session) return;
  const id = String(formData.get('id') ?? '');
  await deleteSubmission(id);
  refresh();
}

export async function disconnectDriveAction() {
  const session = await assertAdminSession();
  if (!session) return;
  await disconnectDrive();
  refresh();
}
