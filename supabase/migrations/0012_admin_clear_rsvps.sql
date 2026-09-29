create or replace function public.admin_clear_all_rsvps()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.';
  end if;
  delete from public.rsvps;
end;
$$;

grant execute on function public.admin_clear_all_rsvps() to authenticated;
