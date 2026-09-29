-- Endereços de entrega e confirmação pública de um presente.

create table if not exists public.gift_addresses (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  recipient text,
  address_line text not null,
  display_order int default 0,
  created_at timestamptz default now()
);

alter table public.gift_addresses enable row level security;

drop policy if exists gift_addresses_public_read on public.gift_addresses;
drop policy if exists gift_addresses_admin_write on public.gift_addresses;
create policy gift_addresses_public_read on public.gift_addresses
  for select using (true);
create policy gift_addresses_admin_write on public.gift_addresses
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.gift_addresses to anon, authenticated;
grant insert, update, delete on public.gift_addresses to authenticated;

alter table public.gifts
  add column if not exists claim_method text,
  add column if not exists claim_address_id uuid references public.gift_addresses(id) on delete set null,
  add column if not exists claim_address_text text;

create or replace function public.claim_gift(
  p_gift_id uuid,
  p_giver_name text,
  p_method text,
  p_address_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_addr text;
  v_updated int;
begin
  v_name := trim(coalesce(p_giver_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid name';
  end if;
  if p_method not in ('pix', 'address', 'in_hand') then
    raise exception 'invalid method';
  end if;

  if p_method = 'address' then
    select trim(both from concat_ws(E'\n', nullif(trim(label), ''), nullif(trim(coalesce(recipient, '')), ''), address_line))
      into v_addr
    from public.gift_addresses
    where id = p_address_id;
    if v_addr is null then
      raise exception 'address not found';
    end if;
  else
    v_addr := null;
  end if;

  update public.gifts
  set taken_by_name = v_name,
      taken_at = now(),
      claim_method = p_method,
      claim_address_id = case when p_method = 'address' then p_address_id else null end,
      claim_address_text = v_addr
  where id = p_gift_id
    and taken_by_name is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'gift unavailable';
  end if;
end;
$$;

revoke all on function public.claim_gift(uuid, text, text, uuid) from public;
grant execute on function public.claim_gift(uuid, text, text, uuid) to anon, authenticated;
