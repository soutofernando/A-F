-- ═══════════════════════════════════════════════════════════════════════
-- 0005 — Lista de compras (rota oculta /despensa)
--   Público lê itens e contribuições; só marca compra via RPC atômica.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

create table if not exists public.shopping_items (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  unit           text not null default 'un',
  needed_qty     numeric(12,3) not null default 0,
  purchased_qty  numeric(12,3) not null default 0,
  display_order  int not null default 0,
  created_at     timestamptz default now(),
  constraint shopping_items_needed_nonneg check (needed_qty >= 0),
  constraint shopping_items_purchased_nonneg check (purchased_qty >= 0)
);

create table if not exists public.shopping_contributions (
  id          uuid primary key default uuid_generate_v4(),
  item_id     uuid not null references public.shopping_items(id) on delete cascade,
  qty         numeric(12,3) not null check (qty > 0),
  buyer_name  text not null,
  created_at  timestamptz default now()
);

create index if not exists idx_shopping_items_order
  on public.shopping_items(display_order);
create index if not exists idx_shopping_contrib_item
  on public.shopping_contributions(item_id, created_at desc);

alter table public.shopping_items enable row level security;
alter table public.shopping_contributions enable row level security;

drop policy if exists shopping_items_public_read on public.shopping_items;
create policy shopping_items_public_read on public.shopping_items
  for select using (true);

drop policy if exists shopping_items_admin_write on public.shopping_items;
create policy shopping_items_admin_write on public.shopping_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists shopping_contrib_public_read on public.shopping_contributions;
create policy shopping_contrib_public_read on public.shopping_contributions
  for select using (true);

drop policy if exists shopping_contrib_admin_all on public.shopping_contributions;
create policy shopping_contrib_admin_all on public.shopping_contributions
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.contribute_shopping_item(
  p_item_id uuid,
  p_qty numeric,
  p_buyer_name text
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

  buyer := nullif(btrim(coalesce(p_buyer_name, '')), '');
  if buyer is null then
    raise exception 'Informe quem está comprando.';
  end if;
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

insert into public.shopping_items (name, unit, needed_qty, purchased_qty, display_order) values
  ('Chocolate ao leite', 'kg', 4, 0, 10),
  ('Chocolate blend', 'kg', 4, 0, 20),
  ('Chocolate meio amargo', 'kg', 4, 0, 30),
  ('Chocolate branco', 'kg', 4, 0, 40),
  ('Cacau 50%', 'kg', 2, 0, 50),
  ('Farinha de trigo', 'kg', 5, 0, 60),
  ('Leite condensado', 'un', 250, 0, 70),
  ('Creme de leite', 'un', 50, 0, 80),
  ('Doce de leite', 'un', 0, 0, 90),
  ('Crocante de amendoim', 'un', 0, 0, 100),
  ('Granulado', 'un', 0, 0, 110)
on conflict do nothing;
