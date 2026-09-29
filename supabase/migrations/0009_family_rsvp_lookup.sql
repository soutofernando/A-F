-- Família na confirmação: o site precisa ler status de RSVP sem expor a tabela inteira.

create or replace function public.lookup_family_rsvp(p_anchor_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g_group text;
  members jsonb := '[]'::jsonb;
begin
  select g.group_name into g_group
  from public.guests g
  where g.id = p_anchor_guest_id;

  if g_group is null or btrim(g_group) = '' then
    return jsonb_build_object('kind', 'single');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'guest_id', g.id,
        'name', coalesce(g.full_name, g.display_name),
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
    and btrim(g.group_name) = btrim(g_group);

  if jsonb_array_length(members) <= 1 then
    return jsonb_build_object('kind', 'single');
  end if;

  return jsonb_build_object(
    'kind', 'family',
    'group_name', btrim(g_group),
    'members', members
  );
end;
$$;

grant execute on function public.lookup_family_rsvp(uuid) to anon, authenticated;
