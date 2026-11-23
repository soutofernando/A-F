-- ═══════════════════════════════════════════════════════════════════════
-- 0024 — Passe de entrada (QR de uso único, só admin)
--   Um token aleatório por convidado. O QR não carrega o id público.
--   consume_entry_pass marca used_at uma única vez, em uma única escrita.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.entry_passes (
  id         uuid primary key default uuid_generate_v4(),
  guest_id   uuid not null unique references public.guests(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now(),
  used_at    timestamptz,
  used_by    text,
  constraint entry_passes_token_format check (token ~ '^[A-Za-z0-9_-]{43}$')
);

create index if not exists entry_passes_used_at on public.entry_passes (used_at);

alter table public.entry_passes enable row level security;

drop policy if exists entry_passes_admin_all on public.entry_passes;
create policy entry_passes_admin_all on public.entry_passes
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.entry_passes from anon, authenticated, public;
grant select, insert, update, delete on table public.entry_passes to authenticated;

create or replace function public.consume_entry_pass(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.entry_passes%rowtype;
  v_guest_id uuid;
  v_name text;
  v_table text;
  v_used timestamptz;
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;

  p_token := btrim(coalesce(p_token, ''));
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.entry_passes ep
     set used_at = now(),
         used_by = nullif(auth.jwt() ->> 'email', '')
   where ep.token = p_token
     and ep.used_at is null
     and exists (
       select 1
         from public.rsvps r
        where r.guest_id = ep.guest_id
          and r.status = 'yes'
     )
  returning * into v_row;

  if found then
    select coalesce(nullif(btrim(g.full_name), ''), g.display_name),
           nullif(btrim(coalesce(g.table_name, '')), '')
      into v_name, v_table
      from public.guests g
     where g.id = v_row.guest_id;

    return jsonb_build_object(
      'ok', true,
      'reason', 'ok',
      'guest_id', v_row.guest_id,
      'name', coalesce(v_name, ''),
      'table_name', v_table,
      'used_at', v_row.used_at
    );
  end if;

  select ep.guest_id,
         ep.used_at,
         coalesce(nullif(btrim(g.full_name), ''), g.display_name),
         nullif(btrim(coalesce(g.table_name, '')), '')
    into v_guest_id, v_used, v_name, v_table
    from public.entry_passes ep
    join public.guests g on g.id = ep.guest_id
   where ep.token = p_token;

  if not found or v_used is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  return jsonb_build_object(
    'ok', false,
    'reason', 'used',
    'guest_id', v_guest_id,
    'name', coalesce(v_name, ''),
    'table_name', v_table,
    'used_at', v_used
  );
end;
$$;

revoke all on function public.consume_entry_pass(text) from public, anon, authenticated;
grant execute on function public.consume_entry_pass(text) to authenticated;
