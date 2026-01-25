alter table public.pesquisas enable row level security;

drop policy if exists "pesquisas_select_public" on public.pesquisas;
create policy "pesquisas_select_public"
on public.pesquisas for select
to anon, authenticated
using (true);

drop policy if exists "pesquisas_insert_auth" on public.pesquisas;
create policy "pesquisas_insert_auth"
on public.pesquisas for insert
to authenticated
with check (true);

drop policy if exists "pesquisas_update_auth" on public.pesquisas;
create policy "pesquisas_update_auth"
on public.pesquisas for update
to authenticated
using (true)
with check (true);

drop policy if exists "pesquisas_delete_auth" on public.pesquisas;
create policy "pesquisas_delete_auth"
on public.pesquisas for delete
to authenticated
using (true);
