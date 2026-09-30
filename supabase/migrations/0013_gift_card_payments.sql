-- Checkout de cartão (Mercado Pago). O presente só sai da lista quando o pagamento é aprovado.
-- Uma reserva de 30 minutos impede duas pessoas de pagarem o mesmo item ao mesmo tempo.

alter table public.gifts
  add column if not exists card_hold_until timestamptz;

create table if not exists public.gift_payments (
  id uuid primary key default uuid_generate_v4(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  giver_name text not null,
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz
);

create unique index if not exists gift_payments_one_pending
  on public.gift_payments (gift_id)
  where status = 'pending';

create unique index if not exists gift_payments_mp_payment
  on public.gift_payments (mp_payment_id)
  where mp_payment_id is not null;

create index if not exists gift_payments_gift_id on public.gift_payments (gift_id);

alter table public.gift_payments enable row level security;

drop policy if exists gift_payments_admin_read on public.gift_payments;
drop policy if exists gift_payments_admin_write on public.gift_payments;
create policy gift_payments_admin_read on public.gift_payments
  for select using (public.is_admin());
create policy gift_payments_admin_write on public.gift_payments
  for all using (public.is_admin()) with check (public.is_admin());

grant select, update on public.gift_payments to authenticated;

-- Presentes com preço passam a aceitar cartão. O admin pode desligar item a item.
update public.gifts
set card_enabled = true
where price_cents is not null
  and price_cents > 0
  and coalesce(card_enabled, false) = false;

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
    and taken_by_name is null
    and (card_hold_until is null or card_hold_until <= now());

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'gift unavailable';
  end if;
end;
$$;

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
  set card_hold_until = now() + interval '30 minutes'
  where id = p_gift_id;

  payment_id := v_payment;
  amount_cents := v_gift.price_cents;
  title := v_gift.title;
  return next;
end;
$$;

create or replace function public.attach_gift_card_preference(
  p_payment_id uuid,
  p_preference_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gift_payments
  set mp_preference_id = p_preference_id
  where id = p_payment_id
    and status = 'pending';
end;
$$;

create or replace function public.release_gift_card(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift uuid;
begin
  update public.gift_payments
  set status = 'cancelled'
  where id = p_payment_id
    and status = 'pending'
  returning gift_id into v_gift;

  if v_gift is null then
    return;
  end if;

  update public.gifts
  set card_hold_until = null
  where id = v_gift
    and taken_by_name is null;
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
        expires_at = now() + interval '30 minutes'
    where id = p_payment_id;
    update public.gifts
    set card_hold_until = now() + interval '30 minutes'
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

revoke all on function public.reserve_gift_card(uuid, text) from public;
revoke all on function public.attach_gift_card_preference(uuid, text) from public;
revoke all on function public.release_gift_card(uuid) from public;
revoke all on function public.apply_gift_card_payment(uuid, text, text) from public;

grant execute on function public.reserve_gift_card(uuid, text) to service_role;
grant execute on function public.attach_gift_card_preference(uuid, text) to service_role;
grant execute on function public.release_gift_card(uuid) to service_role;
grant execute on function public.apply_gift_card_payment(uuid, text, text) to service_role;
