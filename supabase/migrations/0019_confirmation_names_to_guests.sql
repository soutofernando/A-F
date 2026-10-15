-- Nomes adicionados numa confirmação entram na lista pública (guests)
-- para a busca de presença. Não cria RSVP: pré-confirmação continua separada.

create or replace function public.sync_confirmation_names_to_guests()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  el jsonb;
  nm text;
begin
  if new.names is null or jsonb_typeof(new.names) <> 'array' then
    return new;
  end if;

  for el in select * from jsonb_array_elements(new.names) loop
    nm := nullif(btrim(coalesce(el ->> 'name', '')), '');
    if nm is null then
      continue;
    end if;
    perform public.upsert_guest_from_name(nm);
  end loop;

  return new;
end;
$$;

drop trigger if exists confirmations_sync_guest_names on public.confirmations;
create trigger confirmations_sync_guest_names
  after insert or update of names on public.confirmations
  for each row
  execute function public.sync_confirmation_names_to_guests();

do $$
declare
  row record;
  el jsonb;
  nm text;
begin
  for row in select names from public.confirmations loop
    if row.names is null or jsonb_typeof(row.names) <> 'array' then
      continue;
    end if;
    for el in select * from jsonb_array_elements(row.names) loop
      nm := nullif(btrim(coalesce(el ->> 'name', '')), '');
      if nm is null then
        continue;
      end if;
      perform public.upsert_guest_from_name(nm);
    end loop;
  end loop;
end $$;
