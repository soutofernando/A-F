import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { clearAllOfficialRsvps, clearGuestRsvp } from '@/app/admin/confirmacoes/actions';
import {
  buildPresenceParties,
  collectPreListGuestIds,
  countPresenceStats,
  type ConfirmationRow,
  type GuestRow,
  type RsvpRow,
} from '@/lib/admin/presence-parties';
import {
  Card,
  PageHeader,
  Pill,
  Stat,
  SubmitButton,
} from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

async function removeRsvp(formData: FormData) {
  'use server';
  const guestId = String(formData.get('guest_id') ?? '');
  await clearGuestRsvp(guestId);
  revalidatePath('/admin/presencas');
  revalidatePath('/admin/convidados');
}

async function resetAllPresences() {
  'use server';
  await clearAllOfficialRsvps();
  revalidatePath('/admin/presencas');
}

function guestLabel(g: GuestRow) {
  return g.full_name || g.display_name;
}

export default async function PresencasPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: rsvps }, { data: confirmations }] = await Promise.all([
    supabase.from('guests').select('id, display_name, full_name, group_name').order('display_name'),
    supabase.from('rsvps').select('guest_id, status, companions, message'),
    supabase
      .from('confirmations')
      .select('id, names, created_at')
      .eq('attending', true)
      .order('created_at', { ascending: false }),
  ]);

  const list = (guests ?? []) as GuestRow[];
  const rsvpByGuest = new Map<string, RsvpRow>();
  (rsvps ?? []).forEach((r) => rsvpByGuest.set(r.guest_id, r as RsvpRow));

  const confList = (confirmations ?? []) as ConfirmationRow[];
  const { preListGuestIds, preListNameCount } = collectPreListGuestIds(list, confList);
  const stats = countPresenceStats(list, rsvpByGuest, preListGuestIds, preListNameCount);
  const parties = buildPresenceParties(list, confList, rsvpByGuest);

  const partiesWithActivity = parties.filter((party) =>
    party.members.some((m) => rsvpByGuest.has(m.id)),
  );

  const showResetHint = stats.yes > 50;

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        kicker="PRESENÇA NA FESTA"
        title="quem confirmou no site"
        subtitle="A lista de convidados tem mais nomes do que a pré-lista. Aqui acompanhamos quem já fez a pré-confirmação e quem respondeu na home."
      />

      {showResetHint && (
        <div
          style={{
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 10,
            border: '1px solid rgba(232,197,138,.35)',
            background: 'rgba(212,175,122,.08)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'rgba(239,231,219,.85)',
          }}
        >
          Há {stats.yes} presenças marcadas — muitas podem ter sido geradas automaticamente pela
          sincronização antiga com a pré-confirmação. Use{' '}
          <strong>zerar presenças oficiais</strong> uma vez para recomeçar; a pré-confirmação não é
          apagada.
          <form action={resetAllPresences} style={{ marginTop: 12 }}>
            <SubmitButton variant="danger" small>
              zerar presenças oficiais
            </SubmitButton>
          </form>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <Stat
          label="Confirmaram na home"
          value={stats.yes}
          meta={`${stats.preListYes} da pré-lista`}
        />
        <Stat label="Recusaram na home" value={stats.no} meta={`${stats.preListNo} da pré-lista`} />
        <Stat
          label="Pré-lista aguardando"
          value={stats.preListAwaitingHome}
          meta={`de ${stats.preListMatchedGuests} na lista · ${stats.preListNameCount} nomes na pré-lista`}
        />
        <Stat
          label="Convidados cadastrados"
          value={stats.totalGuests}
          meta={`${stats.notOnPreList} ainda não apareceram na pré-lista`}
        />
      </div>

      <Card
        title="Por família (pré-confirmação)"
        subtitle="Lista agrupada como na busca da home. Só aparecem famílias com 2+ pessoas na pré-lista, mais convidados avulsos que já responderam na home."
      >
        {parties.length === 0 ? (
          <div style={{ fontStyle: 'italic', color: '#6E6A5C', padding: '20px 0' }}>
            Nenhuma família na pré-confirmação com 2+ pessoas, ou ninguém respondeu na home ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {parties.map((party) => {
              const yesCount = party.members.filter((m) => rsvpByGuest.get(m.id)?.status === 'yes').length;
              const noCount = party.members.filter((m) => rsvpByGuest.get(m.id)?.status === 'no').length;
              const hasRsvp = party.members.some((m) => rsvpByGuest.has(m.id));

              if (!hasRsvp && party.members.length === 1) return null;

              return (
                <div
                  key={party.key}
                  style={{
                    border: '1px solid rgba(239,231,219,.12)',
                    borderRadius: 12,
                    padding: '16px 18px',
                    background: 'rgba(14,11,9,.35)',
                    opacity: hasRsvp ? 1 : 0.72,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    <div className="serif" style={{ fontSize: 20, color: 'var(--cream)', lineHeight: 1.25 }}>
                      {party.members.length > 1 ? `Família (${party.members.length})` : party.title}
                    </div>
                    {party.members.length > 1 && (
                      <Pill variant={yesCount > 0 ? 'success' : noCount > 0 ? 'danger' : 'muted'}>
                        {yesCount} vai · {noCount} não · {party.members.length - yesCount - noCount} aguardando
                      </Pill>
                    )}
                  </div>
                  {party.members.length > 1 && (
                    <p style={{ fontSize: 12, color: 'rgba(239,231,219,.45)', margin: '0 0 10px' }}>
                      {party.members.map(guestLabel).join(' · ')}
                    </p>
                  )}
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                    {party.members.map((member) => {
                      const rsvp = rsvpByGuest.get(member.id);
                      return (
                        <li
                          key={member.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: 14, color: 'rgba(239,231,219,.9)' }}>
                            {guestLabel(member)}
                          </span>
                          {rsvp?.status === 'yes' ? (
                            <Pill variant="success">vai</Pill>
                          ) : rsvp?.status === 'no' ? (
                            <Pill variant="danger">não vai</Pill>
                          ) : (
                            <Pill variant="muted">aguardando</Pill>
                          )}
                          {rsvp && (
                            <form action={removeRsvp}>
                              <input type="hidden" name="guest_id" value={member.id} />
                              <SubmitButton variant="outline" small>
                                desconfirmar
                              </SubmitButton>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {partiesWithActivity.length === 0 && parties.length > 0 && (
          <p style={{ fontStyle: 'italic', color: '#6E6A5C', marginTop: 20, fontSize: 14 }}>
            Ninguém confirmou presença na home ainda — as famílias acima estão aguardando resposta
            oficial.
          </p>
        )}
      </Card>
    </div>
  );
}
