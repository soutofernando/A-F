-- Valor cobrado no cartão é calculado no app (taxa à vista vs parcelado loja) e validado aqui.

drop function if exists public.reserve_gift_card(uuid, text);

create or replace function public.reserve_gift_card(
  p_gift_id uuid,
  p_giver_name text,
  p_charge_cents int
) returns table (payment_id uuid, amount_cents int, title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_gift public.gifts%rowtype;
  v_payment uuid;
  v_max_charge int;
begin
  v_name := trim(coalesce(p_giver_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid name';
  end if;

  if p_charge_cents is null or p_charge_cents <= 0 then
    raise exception 'invalid charge';
  end if;

  update public.gift_payments
  set status = 'cancelled'
  where status = 'pending'
    and expires_at <= now();

  update public.gifts
  set card_hold_until = null
  where card_hold_until is not null
    and card_hold_until <= now()
    and taken_by_name is null;

  select * into v_gift
  from public.gifts
  where id = p_gift_id
  for update;

  if not found
    or v_gift.taken_by_name is not null
    or (v_gift.card_hold_until is not null and v_gift.card_hold_until > now()) then
    raise exception 'gift unavailable';
  end if;
  if coalesce(v_gift.card_enabled, false) is not true then
    raise exception 'card disabled';
  end if;
  if v_gift.price_cents is null or v_gift.price_cents <= 0 then
    raise exception 'invalid price';
  end if;

  v_max_charge := ceiling(v_gift.price_cents::numeric * 2)::int;
  if p_charge_cents < v_gift.price_cents or p_charge_cents > v_max_charge then
    raise exception 'invalid charge';
  end if;

  insert into public.gift_payments (gift_id, giver_name, amount_cents)
  values (p_gift_id, v_name, p_charge_cents)
  returning id into v_payment;

  update public.gifts
  set card_hold_until = now() + interval '5 minutes'
  where id = p_gift_id;

  payment_id := v_payment;
  amount_cents := p_charge_cents;
  title := v_gift.title;
  return next;
end;
$$;

revoke all on function public.reserve_gift_card(uuid, text, int) from public;
grant execute on function public.reserve_gift_card(uuid, text, int) to service_role;
