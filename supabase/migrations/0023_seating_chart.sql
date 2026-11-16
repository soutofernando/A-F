-- ═══════════════════════════════════════════════════════════════════════
-- 0023 — Mapa de mesas (só admin)
--   Cada coluna do mapa é uma seating_tables; cada lugar, um seating_seat.
--   O nome da mesa no convidado (guests.table_name) acompanha o mapa.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.seating_tables (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  note        text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.seating_seats (
  id         uuid primary key default uuid_generate_v4(),
  table_id   uuid not null references public.seating_tables(id) on delete cascade,
  position   int not null,
  guest_id   uuid references public.guests(id) on delete set null,
  label      text,
  created_at timestamptz not null default now(),
  constraint seating_seats_position_unique unique (table_id, position)
);

create unique index if not exists seating_seats_guest_unique
  on public.seating_seats (guest_id)
  where guest_id is not null;

create index if not exists seating_seats_table_position
  on public.seating_seats (table_id, position);

alter table public.seating_tables enable row level security;
alter table public.seating_seats enable row level security;

drop policy if exists seating_tables_admin_all on public.seating_tables;
create policy seating_tables_admin_all on public.seating_tables
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists seating_seats_admin_all on public.seating_seats;
create policy seating_seats_admin_all on public.seating_seats
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.seating_tables from anon, authenticated, public;
revoke all on table public.seating_seats from anon, authenticated, public;
grant select, insert, update, delete on table public.seating_tables to authenticated;
grant select, insert, update, delete on table public.seating_seats to authenticated;

create or replace function public.save_seating_chart(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tbl jsonb;
  seat jsonb;
  table_id uuid;
  table_name text;
  table_note text;
  table_order int;
  seat_id uuid;
  seat_guest uuid;
  seat_label text;
  seat_pos int;
  seen_tables uuid[] := array[]::uuid[];
  seen_seats uuid[] := array[]::uuid[];
  seen_guests uuid[] := array[]::uuid[];
  table_count int;
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;

  if payload is null or jsonb_typeof(payload->'tables') <> 'array' then
    raise exception 'Mapa inválido.';
  end if;

  table_count := jsonb_array_length(payload->'tables');
  if table_count > 80 then
    raise exception 'Limite de 80 mesas.';
  end if;

  lock table public.seating_tables, public.seating_seats in exclusive mode;

  -- O banco recusa DELETE sem WHERE (supautils).
  delete from public.seating_seats where id is not null;
  delete from public.seating_tables where id is not null;

  for tbl in select value from jsonb_array_elements(payload->'tables')
  loop
    table_id := (tbl->>'id')::uuid;
    if table_id = any (seen_tables) then
      continue;
    end if;
    seen_tables := array_append(seen_tables, table_id);

    table_name := left(btrim(coalesce(tbl->>'name', '')), 80);
    if table_name = '' then
      table_name := 'Mesa';
    end if;
    table_note := nullif(left(btrim(coalesce(tbl->>'note', '')), 160), '');
    table_order := coalesce((tbl->>'sort_order')::int, 0);

    insert into public.seating_tables (id, name, note, sort_order)
    values (table_id, table_name, table_note, table_order);

    if tbl->'seats' is null or jsonb_typeof(tbl->'seats') <> 'array' then
      continue;
    end if;

    if jsonb_array_length(tbl->'seats') > 40 then
      raise exception 'Cada mesa pode ter no máximo 40 lugares.';
    end if;

    seat_pos := 0;
    for seat in select value from jsonb_array_elements(tbl->'seats')
    loop
      seat_id := (seat->>'id')::uuid;
      if seat_id = any (seen_seats) then
        raise exception 'Lugar duplicado.';
      end if;
      seen_seats := array_append(seen_seats, seat_id);

      seat_label := nullif(left(btrim(coalesce(seat->>'label', '')), 120), '');
      seat_guest := nullif(seat->>'guest_id', '')::uuid;

      if seat_guest is not null and not exists (
        select 1 from public.guests g where g.id = seat_guest
      ) then
        seat_guest := null;
      end if;

      if seat_guest is not null and seat_guest = any (seen_guests) then
        seat_guest := null;
      end if;

      if seat_guest is not null then
        seen_guests := array_append(seen_guests, seat_guest);
        seat_label := null;
      end if;

      insert into public.seating_seats (id, table_id, position, guest_id, label)
      values (seat_id, table_id, seat_pos, seat_guest, seat_label);

      seat_pos := seat_pos + 1;
    end loop;
  end loop;

  update public.guests g
     set table_name = st.name
    from public.seating_seats ss
    join public.seating_tables st on st.id = ss.table_id
   where ss.guest_id = g.id
     and g.table_name is distinct from st.name;

  update public.guests g
     set table_name = null
   where g.table_name is not null
     and not exists (
       select 1 from public.seating_seats ss where ss.guest_id = g.id
     );
end;
$$;

revoke all on function public.save_seating_chart(jsonb) from public, anon, authenticated;
grant execute on function public.save_seating_chart(jsonb) to authenticated;
