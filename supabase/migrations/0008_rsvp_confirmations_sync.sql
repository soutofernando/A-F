-- Sync family confirmations (confirmations) into guests + rsvps for the homepage RSVP flow.

grant execute on function public.submit_rsvp(uuid, text, integer, text) to anon, authenticated;

create extension if not exists unaccent;

create or replace function public.normalize_person_name(p_name text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(unaccent(coalesce(p_name, '')), '\s+', ' ', 'g')));
$$;

create or replace function public.guest_slug_from_name(p_name text)
returns text
language sql
immutable
as $$
  select left(
    regexp_replace(public.normalize_person_name(p_name), '[^a-z0-9]+', '-', 'g'),
    48
  ) || '-' || substr(md5(coalesce(p_name, '')), 1, 6);
$$;

create or replace function public.upsert_guest_from_name(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean text;
  gid uuid;
  v_slug text;
begin
  clean := btrim(coalesce(p_name, ''));
  if clean = '' then
    return null;
  end if;

  select g.id into gid
  from public.guests g
  where public.normalize_person_name(coalesce(g.full_name, g.display_name))
      = public.normalize_person_name(clean)
  limit 1;

  if gid is not null then
    return gid;
  end if;

  v_slug := public.guest_slug_from_name(clean);
  insert into public.guests (slug, display_name, full_name, max_companions)
  values (v_slug, clean, clean, 0)
  on conflict (slug) do update
    set display_name = excluded.display_name,
        full_name = coalesce(public.guests.full_name, excluded.full_name)
  returning id into gid;

  return gid;
end;
$$;

create or replace function public.apply_confirmation_to_rsvps(p_attending boolean, p_names jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  el jsonb;
  nm text;
  gid uuid;
  st text;
begin
  if p_names is null or jsonb_typeof(p_names) <> 'array' then
    return;
  end if;

  st := case when p_attending then 'yes' else 'no' end;

  for el in select * from jsonb_array_elements(p_names) loop
    nm := nullif(btrim(coalesce(el ->> 'name', '')), '');
    if nm is null then
      continue;
    end if;
    gid := public.upsert_guest_from_name(nm);
    if gid is null then
      continue;
    end if;
    insert into public.rsvps (guest_id, status, companions)
    values (gid, st, 0)
    on conflict (guest_id) do update
      set status = excluded.status,
          confirmed_at = now();
  end loop;
end;
$$;

create or replace function public.trg_confirmation_sync_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.apply_confirmation_to_rsvps(new.attending, new.names);
  return new;
end;
$$;

drop trigger if exists confirmations_sync_rsvp on public.confirmations;
create trigger confirmations_sync_rsvp
  after insert or update on public.confirmations
  for each row
  execute function public.trg_confirmation_sync_rsvp();

do $$
declare
  row record;
begin
  for row in select attending, names from public.confirmations order by created_at loop
    perform public.apply_confirmation_to_rsvps(row.attending, row.names);
  end loop;
end $$;

create or replace function public.lookup_guest_rsvp(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  q text;
  g_id uuid;
  g_name text;
  r_status text;
  match_count int;
begin
  q := public.normalize_person_name(p_query);
  if length(q) < 2 then
    return jsonb_build_object('kind', 'idle');
  end if;

  select count(*)::int into match_count
  from public.guests g
  where public.normalize_person_name(coalesce(g.full_name, g.display_name)) = q;

  if match_count = 1 then
    select g.id, coalesce(g.full_name, g.display_name)
    into g_id, g_name
    from public.guests g
    where public.normalize_person_name(coalesce(g.full_name, g.display_name)) = q
    limit 1;
  elsif match_count > 1 then
    return jsonb_build_object('kind', 'many');
  else
    select count(*)::int into match_count
    from public.guests g
    where public.normalize_person_name(coalesce(g.full_name, g.display_name)) like '%' || q || '%';
    if match_count = 0 then
      return jsonb_build_object('kind', 'none');
    end if;
    if match_count > 1 then
      return jsonb_build_object('kind', 'many');
    end if;
    select g.id, coalesce(g.full_name, g.display_name)
    into g_id, g_name
    from public.guests g
    where public.normalize_person_name(coalesce(g.full_name, g.display_name)) like '%' || q || '%'
    order by length(coalesce(g.full_name, g.display_name))
    limit 1;
  end if;

  select rv.status into r_status from public.rsvps rv where rv.guest_id = g_id;

  return jsonb_build_object(
    'kind', 'one',
    'guest_id', g_id,
    'name', g_name,
    'rsvp_status', r_status
  );
end;
$$;

grant execute on function public.lookup_guest_rsvp(text) to anon, authenticated;
