import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
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

async function addAddress(formData: FormData) {
  'use server';
  const label = String(formData.get('label') ?? '').trim();
  const addressLine = String(formData.get('address_line') ?? '').trim();
  if (!label || !addressLine) return;
  const recipient = String(formData.get('recipient') ?? '').trim();
  const supabase = await createClient();
  await supabase.from('gift_addresses').insert({
    label,
    recipient: recipient || null,
    address_line: addressLine,
    display_order: Number(formData.get('display_order') ?? 0) || 0,
  });
  revalidatePath('/admin/config');
  revalidatePath('/presentes');
}

async function deleteAddress(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('gift_addresses').delete().eq('id', id);
  revalidatePath('/admin/config');
  revalidatePath('/presentes');
}

type Cfg = { key: string; value: string | null };
type Address = { id: string; label: string; recipient: string | null; address_line: string };

export default async function ConfigPage() {
  const supabase = await createClient();
  const [{ data }, { data: addressRows }] = await Promise.all([
    supabase.from('config').select('key, value'),
    supabase.from('gift_addresses').select('id, label, recipient, address_line').order('display_order').order('label'),
  ]);
  const map = new Map<string, string>();
  ((data ?? []) as Cfg[]).forEach((c) => map.set(c.key, c.value ?? ''));
  const addresses = (addressRows ?? []) as Address[];

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

      <Card
        title="Endereços para entrega"
        subtitle="Quem for dar o item escolhe um destes endereços, ou entrega nas mãos."
      >
        <form action={addAddress} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field label="Nome do endereço" name="label" required placeholder="Casa dos noivos" />
            <Field label="Quem recebe" name="recipient" placeholder="Alicia e Fernando" />
          </div>
          <TextField
            label="Endereço completo"
            name="address_line"
            rows={3}
            placeholder="Rua, número, bairro, cidade, CEP"
          />
          <Field label="Ordem" name="display_order" type="number" defaultValue={0} />
          <div>
            <SubmitButton variant="gold">adicionar endereço</SubmitButton>
          </div>
        </form>
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {addresses.length === 0 ? (
            <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14 }}>
              Nenhum endereço ainda.
            </div>
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderTop: '1px solid rgba(239,231,219,.1)',
                }}
              >
                <div>
                  <div>{address.label}</div>
                  {address.recipient ? (
                    <div style={{ fontSize: 13, color: 'rgba(239,231,219,.6)' }}>{address.recipient}</div>
                  ) : null}
                  <div style={{ fontSize: 13, color: 'rgba(239,231,219,.6)', whiteSpace: 'pre-line' }}>
                    {address.address_line}
                  </div>
                </div>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={address.id} />
                  <SubmitButton variant="danger" small>
                    ✕
                  </SubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
