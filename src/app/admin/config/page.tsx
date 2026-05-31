import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  DateField,
  Field,
  PageHeader,
  Section,
  SubmitButton,
  TextField,
} from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

const BR_TZ = '-03:00';

const fmtDateBR = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

async function saveConfig(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const updates: Array<{ key: string; value: string; updated_at: string }> = [];

  for (const [name, raw] of formData.entries()) {
    if (typeof raw !== 'string') continue;
    if (!name.startsWith('cfg__')) continue;

    const key = name.replace(/^cfg__/, '');
    let value = raw;

    if (key === 'wedding_date' && value) {
      // datetime-local → "YYYY-MM-DDTHH:mm" → "YYYY-MM-DDTHH:mm:00-03:00"
      value = `${value}:00${BR_TZ}`;
    }

    updates.push({ key, value, updated_at: new Date().toISOString() });
  }

  if (updates.length > 0) {
    await supabase.from('config').upsert(updates, { onConflict: 'key' });
  }

  revalidatePath('/admin/config');
  revalidatePath('/');
}

type Cfg = { key: string; value: string | null };

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('config').select('key, value');
  const map = new Map<string, string>();
  ((data ?? []) as Cfg[]).forEach((c) => map.set(c.key, c.value ?? ''));

  const weddingDate = map.get('wedding_date') ?? '';
  const weddingDatePreview = weddingDate
    ? (() => {
        try {
          return fmtDateBR.format(new Date(weddingDate));
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        kicker="CONFIGURAÇÕES"
        title="textos e detalhes do site"
        subtitle="Tudo que aparece no site público — alterações são aplicadas na hora após salvar."
      />

      <form action={saveConfig} className="admin-stagger" style={{ display: 'grid', gap: 8 }}>
        <Section kicker="01" title="O casal & a cerimônia">
          <Field
            label="Nomes do casal"
            name="cfg__couple_names"
            defaultValue={map.get('couple_names')}
            placeholder="Alicia & Fernando"
          />
          <DateField
            label="Data e hora do casamento"
            name="cfg__wedding_date"
            defaultValue={weddingDate}
            hint={
              weddingDatePreview
                ? `Será exibido como: ${weddingDatePreview} (horário de Brasília).`
                : 'Selecione data e hora — fuso de Brasília (-03:00) é aplicado automaticamente.'
            }
          />
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field
              label="Nome da igreja"
              name="cfg__church_name"
              defaultValue={map.get('church_name')}
              placeholder="Sagrado Coração de Jesus"
            />
            <Field
              label="Nome do local da festa"
              name="cfg__venue_name"
              defaultValue={map.get('venue_name')}
              placeholder="Sítio São José da Mata"
            />
          </div>
        </Section>

        <Section kicker="02" title="Apresentação do site">
          <TextField
            label="Subtítulo do hero"
            name="cfg__hero_subtitle"
            defaultValue={map.get('hero_subtitle')}
            rows={2}
            hint="A frase que aparece logo abaixo dos nomes na primeira tela."
          />
        </Section>

        <Section kicker="03" title="Pagamento por PIX">
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field
              label="Banco"
              name="cfg__pix_bank"
              defaultValue={map.get('pix_bank')}
              placeholder="Banco Inter"
            />
            <Field
              label="Titular da conta"
              name="cfg__pix_holder"
              defaultValue={map.get('pix_holder')}
              placeholder="Fernando Souto"
            />
          </div>
          <Field
            label="Chave PIX"
            name="cfg__pix_key"
            defaultValue={map.get('pix_key')}
            placeholder="seu@email.com, CPF, telefone ou aleatória"
          />
        </Section>

        <div style={{ display: 'flex', gap: 14, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(239,231,219,.08)' }}>
          <SubmitButton variant="gold">salvar alterações</SubmitButton>
        </div>
      </form>
    </div>
  );
}
