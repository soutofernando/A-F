-- ═══════════════════════════════════════════════════════════════════════
-- 0025 — Brincadeira da festa
--   Convidados entram por QR e completam desafios com foto (1 ponto cada).
--   Os arquivos ficam só no Google Drive. O banco guarda o ranking, sem a mídia.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.festa_players (
  id           uuid primary key default uuid_generate_v4(),
  token        text not null unique,
  display_name text not null,
  created_at   timestamptz not null default now(),
  constraint festa_players_name_len check (char_length(btrim(display_name)) between 2 and 40),
  constraint festa_players_token_len check (char_length(token) between 32 and 80)
);

create table if not exists public.festa_challenges (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  hint       text,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint festa_challenges_title_len check (char_length(btrim(title)) between 2 and 80)
);

create table if not exists public.festa_submissions (
  id            uuid primary key default uuid_generate_v4(),
  player_id     uuid not null references public.festa_players(id) on delete cascade,
  challenge_id  uuid references public.festa_challenges(id) on delete restrict,
  kind          text not null,
  media_type    text not null,
  drive_file_id text not null unique,
  drive_url     text,
  content_type  text,
  byte_size     int,
  points        int not null default 0,
  created_at    timestamptz not null default now(),
  constraint festa_submissions_kind check (kind in ('challenge', 'gallery')),
  constraint festa_submissions_media check (media_type in ('image', 'video')),
  constraint festa_submissions_points check (points in (0, 1)),
  constraint festa_submissions_shape check (
    (kind = 'challenge' and challenge_id is not null and points = 1 and media_type = 'image')
    or (kind = 'gallery' and challenge_id is null and points = 0)
  )
);

create unique index if not exists festa_one_photo_per_challenge
  on public.festa_submissions (player_id, challenge_id)
  where kind = 'challenge';

create index if not exists festa_submissions_created
  on public.festa_submissions (created_at desc);

create table if not exists public.festa_feed (
  id              uuid primary key,
  player_id       uuid not null,
  display_name    text not null,
  kind            text not null,
  media_type      text not null,
  drive_file_id   text not null,
  points          int not null,
  challenge_id    uuid,
  challenge_title text,
  created_at      timestamptz not null
);

create index if not exists festa_feed_created_at on public.festa_feed (created_at desc);
create index if not exists festa_feed_player on public.festa_feed (player_id);
create index if not exists festa_feed_challenge on public.festa_feed (challenge_id);

alter table public.festa_feed replica identity full;
alter table public.festa_challenges replica identity full;

-- Token do Drive fica aqui. Só o service role grava. O admin lê colunas públicas.
create table if not exists public.festa_settings (
  id                    smallint primary key default 1,
  drive_refresh_token   text,
  drive_folder_id       text,
  drive_folder_url      text,
  drive_connected_email text,
  updated_at            timestamptz not null default now(),
  constraint festa_settings_singleton check (id = 1)
);

insert into public.festa_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.festa_sync_feed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if tg_op = 'DELETE' then
    delete from public.festa_feed where id = old.id;
    return old;
  end if;

  insert into public.festa_feed (
    id, player_id, display_name, kind, media_type, drive_file_id,
    points, challenge_id, challenge_title, created_at
  )
  select
    new.id,
    new.player_id,
    p.display_name,
    new.kind,
    new.media_type,
    new.drive_file_id,
    new.points,
    new.challenge_id,
    c.title,
    new.created_at
  from public.festa_players p
  left join public.festa_challenges c on c.id = new.challenge_id
  where p.id = new.player_id
  on conflict (id) do update set
    player_id = excluded.player_id,
    display_name = excluded.display_name,
    kind = excluded.kind,
    media_type = excluded.media_type,
    drive_file_id = excluded.drive_file_id,
    points = excluded.points,
    challenge_id = excluded.challenge_id,
    challenge_title = excluded.challenge_title;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'festa feed sync failed';
  end if;

  return new;
end;
$$;

create or replace function public.festa_sync_player_name()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.display_name is distinct from old.display_name then
    update public.festa_feed
       set display_name = new.display_name
     where player_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.festa_sync_challenge_title()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.title is distinct from old.title then
    update public.festa_feed
       set challenge_title = new.title
     where challenge_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists festa_submissions_feed on public.festa_submissions;
create trigger festa_submissions_feed
  after insert or update of player_id, kind, media_type, drive_file_id, points, challenge_id or delete
  on public.festa_submissions
  for each row
  execute function public.festa_sync_feed();

drop trigger if exists festa_players_name on public.festa_players;
create trigger festa_players_name
  after update of display_name on public.festa_players
  for each row
  execute function public.festa_sync_player_name();

drop trigger if exists festa_challenges_title on public.festa_challenges;
create trigger festa_challenges_title
  after update of title on public.festa_challenges
  for each row
  execute function public.festa_sync_challenge_title();

revoke all on function public.festa_sync_feed() from public, anon, authenticated;
revoke all on function public.festa_sync_player_name() from public, anon, authenticated;
revoke all on function public.festa_sync_challenge_title() from public, anon, authenticated;

alter table public.festa_players enable row level security;
alter table public.festa_challenges enable row level security;
alter table public.festa_submissions enable row level security;
alter table public.festa_feed enable row level security;
alter table public.festa_settings enable row level security;

drop policy if exists festa_players_admin_all on public.festa_players;
create policy festa_players_admin_all on public.festa_players
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists festa_challenges_read on public.festa_challenges;
create policy festa_challenges_read on public.festa_challenges
  for select using (active = true or public.is_admin());

drop policy if exists festa_challenges_admin_write on public.festa_challenges;
create policy festa_challenges_admin_write on public.festa_challenges
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists festa_submissions_admin_all on public.festa_submissions;
create policy festa_submissions_admin_all on public.festa_submissions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists festa_feed_read on public.festa_feed;
create policy festa_feed_read on public.festa_feed
  for select using (true);

drop policy if exists festa_settings_admin_read on public.festa_settings;
create policy festa_settings_admin_read on public.festa_settings
  for select using (public.is_admin());

revoke all on table public.festa_players from anon, authenticated, public;
grant select, delete on table public.festa_players to authenticated;

revoke all on table public.festa_challenges from anon, authenticated, public;
grant select on table public.festa_challenges to anon, authenticated;
grant insert, update, delete on table public.festa_challenges to authenticated;

revoke all on table public.festa_submissions from anon, authenticated, public;
grant select, delete on table public.festa_submissions to authenticated;

revoke all on table public.festa_feed from anon, authenticated, public;
grant select on table public.festa_feed to anon, authenticated;

revoke all on table public.festa_settings from anon, authenticated, public;
grant select (id, drive_folder_id, drive_folder_url, drive_connected_email, updated_at)
  on table public.festa_settings to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.festa_feed;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.festa_challenges;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

insert into public.festa_challenges (title, hint, sort_order)
select seed.title, seed.hint, seed.sort_order
from (
  values
    ('Uma foto com os noivos', 'Os dois juntos, do jeito que vocês encontrarem.', 10),
    ('Uma foto com os pais da noiva', 'Pode ser um abraço, uma mesa, um riso.', 20),
    ('Uma foto com os pais do noivo', 'Chamem eles para a foto.', 30),
    ('Na pista de dança', 'O chão da festa, com ou sem música.', 40),
    ('Na mesa do bolo', 'O bolo precisa aparecer.', 50),
    ('Com o buquê', 'Quem estiver com as flores.', 60),
    ('A mesa de vocês', 'Todo mundo que sentou junto.', 70),
    ('Um detalhe da festa', 'Um prato, uma luz, um canto que ninguém fotografou.', 80)
) as seed(title, hint, sort_order)
where not exists (select 1 from public.festa_challenges);
