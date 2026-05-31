-- ═══════════════════════════════════════════════════════════════════════
-- 0004 — Pré-confirmação aberta (famílias)
--   Diferente de `rsvps` (que depende da lista `guests` pré-cadastrada),
--   aqui qualquer pessoa com o link confirma livremente, digitando o próprio
--   nome e o dos acompanhantes/crianças. Cada submissão = 1 família/grupo.
--
--   Execute no Supabase SQL Editor: New query → cole tudo → Run
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Tabela ──────────────────────────────────────────────────────────────
create table if not exists public.confirmations (
  id           uuid primary key default uuid_generate_v4(),
  attending    boolean not null default true,
  party_size   int not null default 0,
  names        jsonb not null default '[]'::jsonb,  -- [{ "name": "...", "kind": "adult"|"child" }]
  contact      text,
  message      text,
  created_at   timestamptz default now()
);
create index if not exists idx_confirmations_created on public.confirmations(created_at desc);

alter table public.confirmations enable row level security;

-- ── RLS: público insere via RPC; admin lê/modera ───────────────────────
drop policy if exists confirmations_admin_read   on public.confirmations;
drop policy if exists confirmations_admin_write  on public.confirmations;
drop policy if exists confirmations_admin_delete on public.confirmations;
create policy confirmations_admin_read on public.confirmations
  for select using (public.is_admin());
create policy confirmations_admin_write on public.confirmations
  for update using (public.is_admin());
create policy confirmations_admin_delete on public.confirmations
  for delete using (public.is_admin());

-- ── RPC pública (security definer) — valida e insere ───────────────────
create or replace function public.submit_confirmation(
  p_attending boolean,
  p_names     jsonb default '[]'::jsonb,
  p_contact   text default null,
  p_message   text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n         int;
  new_id    uuid;
  el        jsonb;
  clean     jsonb := '[]'::jsonb;
  nm        text;
  kd        text;
begin
  if p_names is null or jsonb_typeof(p_names) <> 'array' then
    p_names := '[]'::jsonb;
  end if;

  -- Normaliza: mantém só nomes não-vazios, limita tamanho de cada campo.
  for el in select * from jsonb_array_elements(p_names) loop
    nm := nullif(btrim(coalesce(el ->> 'name', '')), '');
    kd := lower(coalesce(el ->> 'kind', 'adult'));
    if kd not in ('adult', 'child') then
      kd := 'adult';
    end if;
    if nm is not null then
      clean := clean || jsonb_build_object('name', left(nm, 120), 'kind', kd);
    end if;
  end loop;

  n := jsonb_array_length(clean);

  if p_attending and n = 0 then
    raise exception 'Informe ao menos um nome para confirmar.';
  end if;
  if n > 30 then
    raise exception 'Limite de 30 pessoas por confirmação.';
  end if;

  insert into public.confirmations (attending, party_size, names, contact, message)
  values (
    p_attending,
    n,
    clean,
    nullif(btrim(coalesce(p_contact, '')), ''),
    nullif(btrim(coalesce(p_message, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.submit_confirmation(boolean, jsonb, text, text) to anon, authenticated;
