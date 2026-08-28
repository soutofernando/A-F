-- 0006 — comprador opcional na lista de compras
create or replace function public.contribute_shopping_item(
  p_item_id uuid,
  p_qty numeric,
  p_buyer_name text default '-'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item      public.shopping_items%rowtype;
  remaining numeric(12,3);
  buyer     text;
  new_id    uuid;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Informe uma quantidade maior que zero.';
  end if;
  if p_qty > 100000 then
    raise exception 'Quantidade acima do limite.';
  end if;

  buyer := coalesce(nullif(btrim(coalesce(p_buyer_name, '')), ''), '-');
  buyer := left(buyer, 80);

  select * into item
  from public.shopping_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item não encontrado.';
  end if;

  remaining := greatest(item.needed_qty - item.purchased_qty, 0);

  if item.needed_qty > 0 and p_qty > remaining then
    raise exception 'Só faltam % %. Você tentou marcar %.',
      trim(to_char(remaining, 'FM999999990.999')), item.unit, trim(to_char(p_qty, 'FM999999990.999'));
  end if;

  update public.shopping_items
     set purchased_qty = purchased_qty + p_qty
   where id = p_item_id;

  insert into public.shopping_contributions (item_id, qty, buyer_name)
  values (p_item_id, p_qty, buyer)
  returning id into new_id;

  select * into item from public.shopping_items where id = p_item_id;
  remaining := case
    when item.needed_qty > 0 then greatest(item.needed_qty - item.purchased_qty, 0)
    else 0
  end;

  return jsonb_build_object(
    'contribution_id', new_id,
    'purchased_qty', item.purchased_qty,
    'needed_qty', item.needed_qty,
    'remaining_qty', remaining
  );
end;
$$;

grant execute on function public.contribute_shopping_item(uuid, numeric, text) to anon, authenticated;
