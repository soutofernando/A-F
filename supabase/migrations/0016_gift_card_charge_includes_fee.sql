-- Cobrança no cartão inclui taxa (~5%) para o valor líquido do presente ser preservado.

create or replace function public.reserve_gift_card(
  p_gift_id uuid,
  p_giver_name text
) returns table (payment_id uuid, amount_cents int, title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_gift public.gifts%rowtype;
  v_payment uuid;
  v_charge_cents int;
  v_fee_rate numeric := 0.05;
begin
  v_name := trim(coalesce(p_giver_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid name';
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

  v_charge_cents := ceiling(v_gift.price_cents::numeric / (1 - v_fee_rate))::int;

  insert into public.gift_payments (gift_id, giver_name, amount_cents)
  values (p_gift_id, v_name, v_charge_cents)
  returning id into v_payment;

  update public.gifts
  set card_hold_until = now() + interval '5 minutes'
  where id = p_gift_id;

  payment_id := v_payment;
  amount_cents := v_charge_cents;
  title := v_gift.title;
  return next;
end;
$$;
