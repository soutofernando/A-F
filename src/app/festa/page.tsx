import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/server';
import type { FestaChallenge, FestaFeedItem } from '@/lib/festa/types';
import { FestaApp } from './FestaApp';

export const dynamic = 'force-dynamic';

const FEED_COLUMNS = 'id, player_id, display_name, kind, media_type, drive_file_id, points, challenge_id, challenge_title, created_at';

export default async function FestaPage() {
  const supabase = await createClient();
  const [challenges, feed] = await Promise.all([
    supabase
      .from('festa_challenges')
      .select('id, title, hint, sort_order, active')
      .eq('active', true)
      .order('sort_order')
      .order('created_at'),
    supabase.from('festa_feed').select(FEED_COLUMNS).order('created_at', { ascending: false }),
  ]);

  if (challenges.error || feed.error) return <FestaDown />;

  return (
    <FestaApp
      challenges={(challenges.data ?? []) as FestaChallenge[]}
      feed={(feed.data ?? []) as FestaFeedItem[]}
    />
  );
}

function FestaDown() {
  return (
    <div className="festa">
      <div className="festa-frame festa-door">
        <Logo height={54} priority />
        <h1>A brincadeira ainda está sendo preparada.</h1>
        <p className="festa-note">Tente de novo daqui a pouco.</p>
      </div>
    </div>
  );
}
