import { headers } from 'next/headers';
import { festaImageUrl } from '@/lib/festa/media';
import { driveStatus } from '@/lib/festa/drive';
import { festaPageUrl, originFrom } from '@/lib/festa/origin';
import { createClient } from '@/lib/supabase/server';
import { FestaQrCard } from '@/components/admin/FestaQrCard';
import {
  Card,
  Checkbox,
  Field,
  PageHeader,
  Stat,
  SubmitButton,
  TextField,
} from '@/components/admin/ui';
import {
  createChallenge,
  disconnectDriveAction,
  removeChallenge,
  removeSubmissionAction,
  updateChallenge,
} from './actions';
import { ConfirmSubmit } from './confirm-submit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DRIVE_NOTES: Record<string, string> = {
  ok: 'Drive conectado. As fotos dos convidados entram nessa pasta.',
  denied: 'A conexão com o Google foi cancelada.',
  state: 'A conexão expirou. Tente de novo.',
  token: 'O Google não devolveu a autorização. Tente conectar outra vez.',
  folder: 'A conta conectou, mas não abriu a pasta do Drive. Use a conta dona dessa pasta e conecte de novo.',
  'missing-client': 'Faltam GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no servidor.',
};

type SubmissionRow = {
  id: string;
  kind: 'challenge' | 'gallery';
  media_type: 'image' | 'video';
  drive_url: string | null;
  drive_file_id: string;
  created_at: string;
  points: number;
  festa_players: { display_name: string } | { display_name: string }[] | null;
  festa_challenges: { title: string } | { title: string }[] | null;
};

function one<T>(value: T | T[] | null) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function when(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminFestaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const aviso = typeof query.aviso === 'string' ? query.aviso : '';
  const driveNote = typeof query.drive === 'string' ? DRIVE_NOTES[query.drive] : '';
  const headerList = await headers();
  const origin = originFrom(headerList);
  const pageUrl = festaPageUrl(origin);
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const redirects = Array.from(new Set([
    `${origin}/api/festa/drive/callback`,
    configured ? `${configured}/api/festa/drive/callback` : '',
  ].filter(Boolean)));

  const supabase = await createClient();
  const challenges = await supabase
    .from('festa_challenges')
    .select('id, title, hint, sort_order, active')
    .order('sort_order')
    .order('created_at');

  if (challenges.error) {
    return (
      <div>
        <PageHeader kicker="Festa" title="brincadeira" subtitle="A migration da festa ainda não foi aplicada." />
      </div>
    );
  }

  const [photos, videos, players, scored, recent, status] = await Promise.all([
    supabase.from('festa_submissions').select('id', { count: 'exact', head: true }).eq('media_type', 'image'),
    supabase.from('festa_submissions').select('id', { count: 'exact', head: true }).eq('media_type', 'video'),
    supabase.from('festa_players').select('id', { count: 'exact', head: true }),
    supabase.from('festa_submissions').select('player_id').eq('kind', 'challenge'),
    supabase
      .from('festa_submissions')
      .select('id, kind, media_type, drive_url, drive_file_id, created_at, points, festa_players(display_name), festa_challenges(title)')
      .order('created_at', { ascending: false })
      .limit(40),
    driveStatus(),
  ]);

  const scoredPeople = new Set((scored.data ?? []).map((row) => row.player_id)).size;
  const submissions = (recent.data ?? []) as SubmissionRow[];
  const nextOrder = ((challenges.data ?? []).reduce((max, row) => Math.max(max, row.sort_order), 0) || 0) + 10;
  const counts = new Map<string, number>();
  const { data: challengeIds } = await supabase.from('festa_submissions').select('challenge_id').eq('kind', 'challenge');
  for (const row of challengeIds ?? []) {
    if (!row.challenge_id) continue;
    counts.set(row.challenge_id, (counts.get(row.challenge_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader
        kicker="Festa"
        title="brincadeira"
        subtitle="Desafios com foto, ranking ao vivo e a galeria dos convidados."
      />

      {(driveNote || aviso === 'oculto') && (
        <p className="italic" style={{ marginTop: -18, marginBottom: 22, color: 'rgba(239,231,219,.75)' }}>
          {aviso === 'oculto'
            ? 'O desafio saiu da lista. As fotos dele continuam na galeria.'
            : driveNote}
        </p>
      )}

      <div className="admin-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 22 }}>
        <Stat label="Fotos" value={photos.count ?? 0} />
        <Stat label="Vídeos" value={videos.count ?? 0} />
        <Stat label="Nomes" value={players.count ?? 0} meta={`${scoredPeople} no ranking`} />
      </div>

      <Card title="QR dos convidados" subtitle="Imprima e deixe na entrada, nas mesas ou no convite.">
        <FestaQrCard url={pageUrl} />
      </Card>

      <Card title="Google Drive" subtitle="As fotos e os vídeos dos convidados vão só para esta pasta. O site não guarda os arquivos.">
        {status.mode === 'oauth' && (
          <p style={{ marginBottom: 12 }}>
            Conectado{status.email ? ` como ${status.email}` : ''}.
            {status.folderUrl && (
              <>
                {' '}
                <a href={status.folderUrl} style={{ color: 'var(--gold-soft)' }}>Abrir a pasta</a>
              </>
            )}
          </p>
        )}
        {status.mode === 'service' && (
          <p style={{ marginBottom: 12 }}>
            Usando a conta de serviço.
            {status.folderUrl && (
              <>
                {' '}
                <a href={status.folderUrl} style={{ color: 'var(--gold-soft)' }}>Abrir a pasta</a>
              </>
            )}
          </p>
        )}
        {status.mode === 'off' && (
          <div style={{ display: 'grid', gap: 10, marginBottom: 16, maxWidth: 640 }}>
            <p>
              Para um Gmail pessoal, conecte a conta dona desta pasta.
              {status.folderUrl && (
                <>
                  {' '}
                  <a href={status.folderUrl} style={{ color: 'var(--gold-soft)' }}>Abrir a pasta</a>
                </>
              )}
            </p>
            <ol style={{ paddingLeft: 18, display: 'grid', gap: 6, color: 'rgba(239,231,219,.75)', fontSize: 14 }}>
              <li>No Google Cloud, crie um projeto e ative a API Google Drive.</li>
              <li>Na tela de consentimento, deixe em teste e coloque o seu e-mail como usuário de teste.</li>
              <li>Crie um cliente OAuth do tipo aplicativo da Web.</li>
              <li>Nas URIs de redirecionamento, cole {redirects.map((uri) => <code key={uri} style={{ display: 'block', marginTop: 4 }}>{uri}</code>)}</li>
              <li>Guarde o ID e o segredo em GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.</li>
            </ol>
            {status.problem && <p style={{ color: '#e08e8e' }}>{status.problem}</p>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {status.oauthConfigured && status.mode !== 'service' && (
            <a
              href="/api/festa/drive/start"
              className="admin-btn admin-btn-gold"
              style={{
                display: 'inline-block',
                background: 'transparent',
                border: '1px solid var(--gold-soft)',
                color: 'var(--gold-soft)',
                padding: '11px 24px',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: 11,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {status.mode === 'oauth' ? 'reconectar' : 'conectar o drive'}
            </a>
          )}
          {status.connectedInDatabase && (
            <form action={disconnectDriveAction}>
              <SubmitButton variant="danger">desconectar</SubmitButton>
            </form>
          )}
        </div>
      </Card>

      <Card title="Novo desafio" subtitle="Cada convidado pode completar o desafio uma vez. Essa foto vale 1 ponto.">
        <form action={createChallenge} style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
          <Field label="Desafio" name="title" required placeholder="Uma foto com os noivos" />
          <TextField label="Como fazer" name="hint" placeholder="Os dois juntos, do jeito que encontrarem." />
          <Field label="Ordem" name="sort_order" type="number" defaultValue={nextOrder} />
          <SubmitButton variant="gold">adicionar desafio</SubmitButton>
        </form>
      </Card>

      {(challenges.data ?? []).map((challenge) => (
        <Card key={challenge.id} title={challenge.title} subtitle={`${counts.get(challenge.id) ?? 0} foto(s)`}>
          <form action={updateChallenge} style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
            <input type="hidden" name="id" value={challenge.id} />
            <Field label="Desafio" name="title" required defaultValue={challenge.title} />
            <TextField label="Como fazer" name="hint" defaultValue={challenge.hint} />
            <Field label="Ordem" name="sort_order" type="number" defaultValue={challenge.sort_order} />
            <Checkbox label="Visível para os convidados" name="active" defaultChecked={challenge.active} />
            {!challenge.active && (
              <p className="italic" style={{ color: 'rgba(239,231,219,.55)' }}>Fora da lista dos convidados.</p>
            )}
            <SubmitButton variant="gold">salvar</SubmitButton>
          </form>
          <form action={removeChallenge} style={{ marginTop: 14 }}>
            <input type="hidden" name="id" value={challenge.id} />
            <ConfirmSubmit
              label={(counts.get(challenge.id) ?? 0) > 0 ? 'ocultar' : 'apagar'}
              message={(counts.get(challenge.id) ?? 0) > 0
                ? 'Este desafio já tem fotos. Ele sai da lista e as fotos ficam na galeria.'
                : 'Apagar este desafio?'}
            />
          </form>
        </Card>
      ))}

      <Card title="Envios" subtitle="Apagar tira a foto da galeria, o ponto do ranking e o arquivo do Drive.">
        <div style={{ display: 'grid', gap: 14 }}>
          {submissions.length === 0 && (
            <p className="italic" style={{ color: 'rgba(239,231,219,.55)' }}>Ninguém enviou nada ainda.</p>
          )}
          {submissions.map((row) => {
            const person = one(row.festa_players);
            const challenge = one(row.festa_challenges);
            return (
              <article key={row.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 12, alignItems: 'center' }}>
                {row.media_type === 'image' ? (
                  <img
                    src={festaImageUrl(row.drive_file_id, 200)}
                    alt=""
                    width={72}
                    height={72}
                    style={{ width: 72, height: 72, objectFit: 'cover', background: '#1c1814' }}
                  />
                ) : (
                  <div style={{ width: 72, height: 72, display: 'grid', placeItems: 'center', background: '#1c1814', fontStyle: 'italic' }}>
                    vídeo
                  </div>
                )}
                <div>
                  <div>{person?.display_name || 'Convidado'}</div>
                  <div className="italic" style={{ color: 'rgba(239,231,219,.6)', fontSize: 13 }}>
                    {row.kind === 'gallery' ? 'Galeria' : challenge?.title || 'Desafio'} · {when(row.created_at)}
                  </div>
                  {row.drive_url && (
                    <a href={row.drive_url} style={{ color: 'var(--gold-soft)', fontSize: 13 }}>abrir no Drive</a>
                  )}
                </div>
                <form action={removeSubmissionAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <ConfirmSubmit label="apagar" message="Apagar esta foto da galeria, do ranking e do Drive?" />
                </form>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
