-- Pulso Sano: una fila por usuario con todos sus datos. Solo su dueño puede leerla o cambiarla.
create table if not exists public.pulso_state (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.pulso_state enable row level security;
create policy "leer lo propio" on public.pulso_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear lo propio" on public.pulso_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cambiar lo propio" on public.pulso_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "borrar lo propio" on public.pulso_state for delete to authenticated using ((select auth.uid()) = user_id);
