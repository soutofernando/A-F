-- Alguns presentes só podem ser pagos (PIX ou cartão), sem entrega física.

alter table public.gifts
  add column if not exists delivery_enabled boolean not null default true;

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
  v_delivery boolean;
begin
  v_name := trim(coalesce(p_giver_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid name';
  end if;
  if p_method not in ('pix', 'address', 'in_hand') then
    raise exception 'invalid method';
  end if;

  select coalesce(delivery_enabled, true)
    into v_delivery
  from public.gifts
  where id = p_gift_id;

  if v_delivery is null then
    raise exception 'gift unavailable';
  end if;

  if p_method in ('address', 'in_hand') and v_delivery is not true then
    raise exception 'delivery disabled';
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
    and taken_by_name is null
    and (card_hold_until is null or card_hold_until <= now());

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'gift unavailable';
  end if;
end;
$$;
