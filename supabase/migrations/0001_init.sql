-- ═══════════════════════════════════════════════════════════════════════
-- Alicia & Fernando — schema inicial (idempotente, pode rodar de novo)
-- Execute no Supabase SQL Editor: New query → cole tudo → Run
-- ═══════════════════════════════════════════════════════════════════════

-- ── Extensões ──────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ── Tabela de admins + helper is_admin() ───────────────────────────────
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.admins
    where email = auth.jwt() ->> 'email'
  );
$$;


-- ── Config ─────────────────────────────────────────────────────────────
create table if not exists public.config (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

insert into public.config (key, value) values
  ('couple_names',    'Alicia & Fernando'),
  ('wedding_date',    '2026-11-28T09:00:00-03:00'),
  ('pix_key',         ''),
  ('pix_bank',        'Banco Inter'),
  ('pix_holder',      ''),
  ('hero_subtitle',   'pelos olhares que não desviaram, até virarem destino.'),
  ('church_name',     'Sagrado Coração de Jesus'),
  ('venue_name',      'Sítio São José da Mata')
on conflict (key) do nothing;


-- ── Convidados ─────────────────────────────────────────────────────────
create table if not exists public.guests (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  display_name    text not null,
  full_name       text,
  greeting        text,
  group_name      text,
  table_name      text,
  max_companions  int default 0,
  created_at      timestamptz default now()
);
create index if not exists idx_guests_slug on public.guests(slug);


-- ── RSVPs ──────────────────────────────────────────────────────────────
create table if not exists public.rsvps (
  id            uuid primary key default uuid_generate_v4(),
  guest_id      uuid references public.guests(id) on delete cascade,
  status        text not null check (status in ('yes','no')),
  companions    int default 0,
  message       text,
  confirmed_at  timestamptz default now()
);


-- ── Imagens ────────────────────────────────────────────────────────────
create table if not exists public.images (
  id            uuid primary key default uuid_generate_v4(),
  context       text not null,
  storage_path  text not null,
  alt           text,
  display_order int default 0,
  created_at    timestamptz default now()
);
create index if not exists idx_images_context on public.images(context);


-- ── Presentes ──────────────────────────────────────────────────────────
create table if not exists public.gifts (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  category      text not null,
  price_cents   int,
  image_id      uuid references public.images(id) on delete set null,
  pix_enabled   boolean default true,
  card_enabled  boolean default false,
  display_order int default 0,
  taken_by_name text,
  taken_at      timestamptz,
  created_at    timestamptz default now()
);


-- ── Recados ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  guest_name  text not null,
  body        text not null,
  approved    boolean default false,
  created_at  timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════

alter table public.admins   enable row level security;
alter table public.config   enable row level security;
alter table public.guests   enable row level security;
alter table public.rsvps    enable row level security;
alter table public.images   enable row level security;
alter table public.gifts    enable row level security;
alter table public.messages enable row level security;


-- ── admins ─────────────────────────────────────────────────────────────
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
  for select using (public.is_admin());


-- ── config: público lê; admin escreve ──────────────────────────────────
drop policy if exists config_read  on public.config;
drop policy if exists config_write on public.config;
create policy config_read on public.config
  for select using (true);
create policy config_write on public.config
  for all using (public.is_admin()) with check (public.is_admin());


-- ── guests: público lê (pelo slug); admin escreve ──────────────────────
drop policy if exists guests_public_read  on public.guests;
drop policy if exists guests_admin_write  on public.guests;
create policy guests_public_read on public.guests
  for select using (true);
create policy guests_admin_write on public.guests
  for all using (public.is_admin()) with check (public.is_admin());


-- ── rsvps: público insere; admin lê/modera ─────────────────────────────
drop policy if exists rsvps_public_insert on public.rsvps;
drop policy if exists rsvps_admin_read    on public.rsvps;
drop policy if exists rsvps_admin_write   on public.rsvps;
drop policy if exists rsvps_admin_delete  on public.rsvps;
create policy rsvps_public_insert on public.rsvps
  for insert with check (true);
create policy rsvps_admin_read on public.rsvps
  for select using (public.is_admin());
create policy rsvps_admin_write on public.rsvps
  for update using (public.is_admin());
create policy rsvps_admin_delete on public.rsvps
  for delete using (public.is_admin());


-- ── images: público lê; admin escreve ──────────────────────────────────
drop policy if exists images_public_read on public.images;
drop policy if exists images_admin_write on public.images;
create policy images_public_read on public.images
  for select using (true);
create policy images_admin_write on public.images
  for all using (public.is_admin()) with check (public.is_admin());


-- ── gifts: público lê; admin escreve ───────────────────────────────────
drop policy if exists gifts_public_read   on public.gifts;
drop policy if exists gifts_admin_write   on public.gifts;
drop policy if exists gifts_admin_update  on public.gifts;
drop policy if exists gifts_admin_delete  on public.gifts;
create policy gifts_public_read on public.gifts
  for select using (true);
create policy gifts_admin_write on public.gifts
  for insert with check (public.is_admin());
create policy gifts_admin_update on public.gifts
  for update using (public.is_admin());
create policy gifts_admin_delete on public.gifts
  for delete using (public.is_admin());


-- ── messages: público insere; público lê aprovados; admin tudo ─────────
drop policy if exists messages_public_insert on public.messages;
drop policy if exists messages_public_read   on public.messages;
drop policy if exists messages_admin_all     on public.messages;
create policy messages_public_insert on public.messages
  for insert with check (true);
create policy messages_public_read on public.messages
  for select using (approved = true);
create policy messages_admin_all on public.messages
  for all using (public.is_admin()) with check (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════
-- Storage bucket para fotos
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true)
  on conflict (id) do nothing;

drop policy if exists "photos public read"  on storage.objects;
drop policy if exists "photos admin insert" on storage.objects;
drop policy if exists "photos admin update" on storage.objects;
drop policy if exists "photos admin delete" on storage.objects;

create policy "photos public read"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "photos admin insert"
  on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_admin());

create policy "photos admin update"
  on storage.objects for update
  using (bucket_id = 'photos' and public.is_admin());

create policy "photos admin delete"
  on storage.objects for delete
  using (bucket_id = 'photos' and public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════
-- Seed: autorizar você como admin
-- ═══════════════════════════════════════════════════════════════════════

insert into public.admins (email) values
  ('fernandosoutol45@gmail.com')
on conflict (email) do nothing;
