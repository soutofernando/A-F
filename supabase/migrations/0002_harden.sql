-- ═══════════════════════════════════════════════════════════════════════
-- 0002 — endurecimento de segurança (idempotente)
--   1) is_admin(): fixa search_path para evitar lint mutable
--   2) photos bucket: remove SELECT policy ampla — bucket público já serve
--      arquivos via URL pública (/storage/v1/object/public/photos/...);
--      a policy só servia para listar/enumerar objetos.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.is_admin() returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins
    where email = auth.jwt() ->> 'email'
  );
$$;

drop policy if exists "photos public read" on storage.objects;
