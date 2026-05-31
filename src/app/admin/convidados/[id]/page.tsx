import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card, Field, PageHeader, SubmitButton, TextField } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

async function updateGuest(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from('guests')
    .update({
      slug: String(formData.get('slug') ?? '').trim(),
      display_name: String(formData.get('display_name') ?? '').trim(),
      full_name: String(formData.get('full_name') ?? '').trim() || null,
      greeting: String(formData.get('greeting') ?? '').trim() || null,
      group_name: String(formData.get('group_name') ?? '').trim() || null,
      table_name: String(formData.get('table_name') ?? '').trim() || null,
      max_companions: Number(formData.get('max_companions') ?? 0) || 0,
    })
    .eq('id', id);
  revalidatePath('/admin/convidados');
  redirect('/admin/convidados');
}

export default async function EditGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: guest } = await supabase.from('guests').select('*').eq('id', id).maybeSingle();
  if (!guest) notFound();

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader kicker="EDITAR CONVIDADO" title={guest.display_name} subtitle={`/convidado/${guest.slug}`} />

      <Card>
        <form action={updateGuest} style={{ display: 'grid', gap: 16 }}>
          <input type="hidden" name="id" value={guest.id} />
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field label="Nome de exibição" name="display_name" defaultValue={guest.display_name} required />
            <Field label="Nome completo" name="full_name" defaultValue={guest.full_name} />
            <Field label="Grupo" name="group_name" defaultValue={guest.group_name} />
            <Field label="Mesa" name="table_name" defaultValue={guest.table_name} />
            <Field
              label="Máx. de acompanhantes"
              name="max_companions"
              type="number"
              min={0}
              defaultValue={guest.max_companions ?? 0}
            />
            <Field
              label="Slug (URL)"
              name="slug"
              defaultValue={guest.slug}
              required
              hint="Use só letras minúsculas, números e hífens."
            />
          </div>
          <TextField label="Saudação personalizada" name="greeting" defaultValue={guest.greeting} rows={3} />

          <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(239,231,219,.08)' }}>
            <SubmitButton variant="gold">salvar alterações</SubmitButton>
            <Link
              href="/admin/convidados"
              className="admin-btn"
              style={{
                color: 'rgba(239,231,219,.6)',
                fontSize: 11,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                alignSelf: 'center',
                padding: '11px 16px',
              }}
            >
              voltar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
