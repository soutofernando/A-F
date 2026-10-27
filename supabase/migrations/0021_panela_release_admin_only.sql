-- 0021 — liberar item do chá só para admin autenticado
revoke all on function public.release_panela_item(uuid) from public, anon;
grant execute on function public.release_panela_item(uuid) to authenticated;
