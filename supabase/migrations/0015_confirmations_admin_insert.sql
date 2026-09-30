drop policy if exists confirmations_admin_insert on public.confirmations;
create policy confirmations_admin_insert on public.confirmations
  for insert with check (public.is_admin());
