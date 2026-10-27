-- 0022 — presente personalizado no chá de panela
--   Cria o item já escolhido. O retorno não inclui quem vai dar.

create or replace function public.add_custom_panela_item(
  p_item_name text,
  p_giver_name text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item_name text;
  giver     text;
  next_ord  int;
  new_id    uuid;
begin
  item_name := nullif(btrim(coalesce(p_item_name, '')), '');
  giver := nullif(btrim(coalesce(p_giver_name, '')), '');

  if item_name is null or char_length(item_name) < 2 then
    raise exception 'Escreva o nome do presente.';
  end if;
  if giver is null or char_length(giver) < 2 then
    raise exception 'Escreva o nome de quem vai dar o presente.';
  end if;

  item_name := left(item_name, 120);
  giver := left(giver, 80);

  perform pg_advisory_xact_lock(hashtext('panela_items_order'));

  select coalesce(max(display_order), 0) + 10
    into next_ord
  from public.panela_items;

  insert into public.panela_items (name, display_order, claimed)
  values (item_name, next_ord, true)
  returning id into new_id;

  insert into public.panela_claims (item_id, giver_name)
  values (new_id, giver);

  return jsonb_build_object(
    'id', new_id,
    'name', item_name,
    'display_order', next_ord,
    'claimed', true
  );
end;
$$;

revoke all on function public.add_custom_panela_item(text, text) from public, anon, authenticated;
grant execute on function public.add_custom_panela_item(text, text) to anon, authenticated;
