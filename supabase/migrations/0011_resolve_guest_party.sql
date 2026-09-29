-- Agrupa convidados pelo mesmo registro de pré-confirmação (/confirmar) ou pelo campo group_name.

create or replace function public.resolve_guest_party(p_anchor_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  anchor_name text;
  anchor_group text;
  members jsonb := '[]'::jsonb;
  conf_names jsonb;
  el jsonb;
  nm text;
  kd text;
  gid uuid;
begin
  select coalesce(g.full_name, g.display_name), g.group_name
  into anchor_name, anchor_group
  from public.guests g
  where g.id = p_anchor_guest_id;

  if anchor_name is null then
    return jsonb_build_object('kind', 'single', 'members', '[]'::jsonb);
  end if;

  -- 1) Pré-confirmação mais recente que inclui este nome
  select c.names
  into conf_names
  from public.confirmations c
  where c.attending = true
    and jsonb_typeof(c.names) = 'array'
    and jsonb_array_length(c.names) > 1
    and exists (
      select 1
      from jsonb_array_elements(c.names) item
      where public.normalize_person_name(item ->> 'name')
          = public.normalize_person_name(anchor_name)
    )
  order by c.created_at desc
  limit 1;

  if conf_names is not null then
    for el in select * from jsonb_array_elements(conf_names) loop
      nm := nullif(btrim(coalesce(el ->> 'name', '')), '');
      if nm is null then
        continue;
      end if;
      kd := lower(coalesce(el ->> 'kind', 'adult'));
      if kd not in ('adult', 'child') then
        kd := 'adult';
      end if;

      select g.id into gid
      from public.guests g
      where public.normalize_person_name(coalesce(g.full_name, g.display_name))
          = public.normalize_person_name(nm)
      limit 1;

      if gid is null then
        continue;
      end if;

      members := members || jsonb_build_object(
        'guest_id', gid,
        'name', nm,
        'kind', kd,
        'rsvp_status', (select rv.status from public.rsvps rv where rv.guest_id = gid)
      );
    end loop;

    if jsonb_array_length(members) > 1 then
      return jsonb_build_object('kind', 'family', 'members', members);
    end if;
  end if;

  -- 2) Mesmo group_name no cadastro de convidados
  if anchor_group is not null and btrim(anchor_group) <> '' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'guest_id', g.id,
          'name', coalesce(g.full_name, g.display_name),
          'kind', 'adult',
          'rsvp_status', rv.status
        )
        order by coalesce(g.full_name, g.display_name)
      ),
      '[]'::jsonb
    )
    into members
    from public.guests g
    left join public.rsvps rv on rv.guest_id = g.id
    where g.group_name is not null
      and btrim(g.group_name) = btrim(anchor_group);

    if jsonb_array_length(members) > 1 then
      return jsonb_build_object(
        'kind', 'family',
        'group_name', btrim(anchor_group),
        'members', members
      );
    end if;
  end if;

  return jsonb_build_object(
    'kind', 'single',
    'members', jsonb_build_array(
      jsonb_build_object(
        'guest_id', p_anchor_guest_id,
        'name', anchor_name,
        'kind', 'adult',
        'rsvp_status', (select rv.status from public.rsvps rv where rv.guest_id = p_anchor_guest_id)
      )
    )
  );
end;
$$;

grant execute on function public.resolve_guest_party(uuid) to anon, authenticated;

create or replace function public.lookup_family_rsvp(p_anchor_guest_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.resolve_guest_party(p_anchor_guest_id);
$$;
