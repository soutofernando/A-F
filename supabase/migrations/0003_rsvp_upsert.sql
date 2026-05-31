-- ═══════════════════════════════════════════════════════════════════════
-- 0003 — RSVP upsert público
--   1) unique(guest_id) em rsvps — uma confirmação por convidado
--   2) RPC submit_rsvp() (security definer) — permite anônimo confirmar
--      sem precisar de UPDATE público na tabela
-- ═══════════════════════════════════════════════════════════════════════

-- Limpa duplicatas existentes (se houver) antes de criar o constraint
delete from public.rsvps r1
using public.rsvps r2
where r1.guest_id = r2.guest_id
  and r1.confirmed_at < r2.confirmed_at;

-- Constraint
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'rsvps_guest_id_unique'
  ) then
    alter table public.rsvps add constraint rsvps_guest_id_unique unique (guest_id);
  end if;
end $$;

-- Função pública pra confirmar / atualizar RSVP
create or replace function public.submit_rsvp(
  p_guest_id uuid,
  p_status text,
  p_companions int default 0,
  p_message text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g_max int;
begin
  if p_status not in ('yes','no') then
    raise exception 'status inválido';
  end if;

  select max_companions into g_max from public.guests where id = p_guest_id;
  if g_max is null then
    raise exception 'convidado não encontrado';
  end if;

  if coalesce(p_companions, 0) < 0 or coalesce(p_companions, 0) > g_max then
    raise exception 'número de acompanhantes fora do permitido';
  end if;

  insert into public.rsvps (guest_id, status, companions, message)
  values (p_guest_id, p_status, coalesce(p_companions, 0), p_message)
  on conflict (guest_id) do update
    set status       = excluded.status,
        companions   = excluded.companions,
        message      = excluded.message,
        confirmed_at = now();
end;
$$;
