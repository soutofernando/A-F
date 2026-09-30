-- Reserva de checkout no cartão: 5 minutos (antes 30).

alter table public.gift_payments
  alter column expires_at set default (now() + interval '5 minutes');

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

  insert into public.gift_payments (gift_id, giver_name, amount_cents)
  values (p_gift_id, v_name, v_gift.price_cents)
  returning id into v_payment;

  update public.gifts
  set card_hold_until = now() + interval '5 minutes'
  where id = p_gift_id;

  payment_id := v_payment;
  amount_cents := v_gift.price_cents;
  title := v_gift.title;
  return next;
end;
$$;

create or replace function public.apply_gift_card_payment(
  p_payment_id uuid,
  p_mp_payment_id text,
  p_status text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.gift_payments%rowtype;
  v_updated int;
begin
  if p_status not in ('approved', 'pending', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back') then
    return 'ignored';
  end if;

  select * into v_pay
  from public.gift_payments
  where id = p_payment_id
  for update;

  if not found then
    return 'missing';
  end if;

  if v_pay.status = 'approved' and p_status not in ('refunded', 'charged_back') then
    return 'approved';
  end if;

  if p_status in ('pending', 'in_process') then
    update public.gift_payments
    set mp_payment_id = coalesce(nullif(p_mp_payment_id, ''), mp_payment_id),
        expires_at = now() + interval '5 minutes'
    where id = p_payment_id;
    update public.gifts
    set card_hold_until = now() + interval '5 minutes'
    where id = v_pay.gift_id
      and taken_by_name is null;
    return 'pending';
  end if;

  if p_status = 'approved' then
    update public.gifts
    set taken_by_name = v_pay.giver_name,
        taken_at = coalesce(taken_at, now()),
        claim_method = 'card',
        claim_address_id = null,
        claim_address_text = null,
        card_hold_until = null
    where id = v_pay.gift_id
      and (
        taken_by_name is null
        or (claim_method = 'card' and taken_by_name = v_pay.giver_name)
      );

    get diagnostics v_updated = row_count;

    update public.gift_payments
    set status = 'approved',
        mp_payment_id = nullif(p_mp_payment_id, ''),
        paid_at = coalesce(paid_at, now())
    where id = p_payment_id;

    if v_updated = 0 then
      return 'conflict';
    end if;
    return 'approved';
  end if;

  update public.gift_payments
  set status = case when p_status = 'rejected' then 'rejected' else 'cancelled' end,
      mp_payment_id = coalesce(nullif(p_mp_payment_id, ''), mp_payment_id)
  where id = p_payment_id;

  if p_status in ('refunded', 'charged_back') then
    update public.gifts
    set taken_by_name = null,
        taken_at = null,
        claim_method = null,
        card_hold_until = null
    where id = v_pay.gift_id
      and claim_method = 'card'
      and taken_by_name = v_pay.giver_name;
  end if;

  update public.gifts
  set card_hold_until = null
  where id = v_pay.gift_id
    and taken_by_name is null;

  return 'released';
end;
$$;
