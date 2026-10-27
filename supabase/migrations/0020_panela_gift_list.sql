-- ═══════════════════════════════════════════════════════════════════════
-- 0020 — Lista do chá de panela
--   Público lê só o item e se já foi escolhido.
--   O nome de quem vai dar fica em panela_claims, visível só para admin.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.panela_items (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  display_order  int not null,
  claimed        boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint panela_items_order_unique unique (display_order)
);

create table if not exists public.panela_claims (
  item_id      uuid primary key references public.panela_items(id) on delete cascade,
  giver_name   text not null,
  created_at   timestamptz not null default now(),
  constraint panela_claims_name_len check (char_length(giver_name) between 2 and 80)
);

alter table public.panela_items enable row level security;
alter table public.panela_claims enable row level security;

drop policy if exists panela_items_public_read on public.panela_items;
create policy panela_items_public_read on public.panela_items
  for select using (true);

drop policy if exists panela_items_admin_write on public.panela_items;
create policy panela_items_admin_write on public.panela_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists panela_claims_admin_all on public.panela_claims;
create policy panela_claims_admin_all on public.panela_claims
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.panela_claims from anon, public;
revoke insert, update, delete, truncate on table public.panela_items from anon, public;
grant select on table public.panela_items to anon, authenticated;
grant select, insert, update, delete on table public.panela_claims to authenticated;
grant select, insert, update, delete on table public.panela_items to authenticated;

create or replace function public.claim_panela_item(
  p_item_id uuid,
  p_giver_name text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item  public.panela_items%rowtype;
  giver text;
begin
  giver := nullif(btrim(coalesce(p_giver_name, '')), '');
  if giver is null or char_length(giver) < 2 then
    raise exception 'Escreva o nome de quem vai dar o presente.';
  end if;
  giver := left(giver, 80);

  select * into item
  from public.panela_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item não encontrado.';
  end if;

  if item.claimed then
    raise exception 'Esse item já foi escolhido.';
  end if;

  update public.panela_items
     set claimed = true
   where id = p_item_id;

  insert into public.panela_claims (item_id, giver_name)
  values (p_item_id, giver);

  return jsonb_build_object('claimed', true);
end;
$$;

create or replace function public.release_panela_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.';
  end if;

  if not exists (select 1 from public.panela_items where id = p_item_id) then
    raise exception 'Item não encontrado.';
  end if;

  delete from public.panela_claims where item_id = p_item_id;

  update public.panela_items
     set claimed = false
   where id = p_item_id;
end;
$$;

revoke all on function public.claim_panela_item(uuid, text) from public;
revoke all on function public.release_panela_item(uuid) from public, anon;
grant execute on function public.claim_panela_item(uuid, text) to anon, authenticated;
grant execute on function public.release_panela_item(uuid) to authenticated;

insert into public.panela_items (name, display_order) values
  ('Jogo 10 colheres de silicone cabo inox, preto', 10),
  ('Jogo de utensílios de cozinha 6 peças, silicone', 20),
  ('Espátulas pretas', 30),
  ('Frigideira wok de indução Prime Cook antiaderente, Wolff', 40),
  ('Prato duplo cristal para doces Pearl Wolff', 50),
  ('Prato para bolo cristal com pé Wolff Pearl', 60),
  ('Centro de mesa com pé de cristal Geneva', 70),
  ('Centro de mesa de cristal Geneva', 80),
  ('Conjunto de sobremesa Wolff Geneva em vidro, 7 peças', 90),
  ('4 pratos Wolff Pearl de coração', 100),
  ('Travessa de pé Geneva', 110),
  ('Ralador zester inox', 120),
  ('Ralador 4 faces inox', 130),
  ('4 descansos para panela redondos de silicone', 140),
  ('Descanso oval preto, cerâmica artesanal estilo Le Creuset', 150),
  ('Kit 3 travessas com alça de porcelana', 160),
  ('Kit 2 travessas retangulares grandes 4,5 L', 170),
  ('Conjunto assadeiras 6 peças de vidro com tampa cinza ou rosa, Marinex', 180),
  ('Travessa assadeira de vidro retangular Marinex 3,5 L, Nadir', 190),
  ('Travessa de vidro', 200),
  ('Pote retangular Facilita 750 ml com tampa rosa, Marinex', 210),
  ('Kit 3 formas assadeiras teflon antiaderente PMG, Vitzen', 220),
  ('Forma para bolo com furo, redonda, antiaderente preta', 230),
  ('Forma para bolo sem furo, preta', 240),
  ('Forma assadeira de pizza 35 cm antiaderente', 250),
  ('Kit 6 tigelas de porcelana branca 440 ml', 260),
  ('Kit 6 tigelas de porcelana rosa 440 ml', 270),
  ('Kit 3 bowls de inox com tampa, 1,4 L, 2 L e 2,6 L, Electrolux', 280),
  ('Travessa redonda de cerâmica', 290),
  ('Chaleira elétrica', 300),
  ('Batedeira Mondial 400W Prática', 310),
  ('Espremedor de frutas Mondial Premium E-02', 320),
  ('Espremedor de laranja e limão manual', 330),
  ('Kit acessórios de limpeza 4 peças', 340),
  ('Kit de potes herméticos com medidor 2,5 L, para produto de limpeza', 350),
  ('Suporte para pia Tramontina Plurale inox, cinza-escuro', 360),
  ('Porta detergente inox com dispenser e suporte para esponja', 370),
  ('Escorredor de louças Top Dry, tapete de microfibra, Electrolux', 380),
  ('2 tesouras Tramontina de cozinha', 390),
  ('Cortador de pizza', 400),
  ('Afiador de facas', 410),
  ('10 potes de vidro herméticos 640 ml', 420),
  ('10 potes de vidro herméticos 370 ml', 430),
  ('Kit de toalhinhas de prato', 440),
  ('Kit de pano de chão', 450),
  ('Jogo de tapete para banheiro cinza', 460)
on conflict (display_order) do nothing;
