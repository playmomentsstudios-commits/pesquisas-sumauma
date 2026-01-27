-- ============================================================
-- FIX DEFINITIVO: cria site_config + libera leitura pública
-- + libera leitura pública para pesquisas e pontos (mapa público)
-- + opcional: VIEW pontos -> pesquisa_pontos_mapa (se necessário)
-- ============================================================

-- 1) SITE CONFIG (corrige 404)
create table if not exists public.site_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create or replace function public.site_config_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_config_updated_at on public.site_config;
create trigger trg_site_config_updated_at
before update on public.site_config
for each row execute function public.site_config_touch_updated_at();

alter table public.site_config enable row level security;

drop policy if exists "Public can read site_config" on public.site_config;
create policy "Public can read site_config"
on public.site_config for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can write site_config" on public.site_config;
create policy "Authenticated can write site_config"
on public.site_config for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update site_config" on public.site_config;
create policy "Authenticated can update site_config"
on public.site_config for update
to authenticated
using (true)
with check (true);


-- 2) PESQUISAS: o público precisa ler para resolver id por slug
alter table public.pesquisas enable row level security;

drop policy if exists "Public can read pesquisas" on public.pesquisas;
create policy "Public can read pesquisas"
on public.pesquisas for select
to anon, authenticated
using (true);


-- 3) PONTOS: o público precisa ler os pontos ATIVOS
alter table public.pontos enable row level security;

drop policy if exists "Public can read pontos ativos" on public.pontos;
create policy "Public can read pontos ativos"
on public.pontos for select
to anon, authenticated
using (ativo = true);


-- 4) (OPCIONAL) Se seus dados estão em public.pesquisa_pontos_mapa e NÃO em public.pontos,
-- crie a VIEW abaixo para manter o front funcionando (sem trocar código).
-- Se você JÁ usa public.pontos com dados, NÃO rode esta parte.
-- ------------------------------------------------------------
-- do $$
-- begin
--   if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pesquisa_pontos_mapa') then
--     execute $v$
--       create or replace view public.pontos as
--       select
--         id,
--         pesquisa_id,
--         nome,
--         categoria,
--         territorio,
--         contato,
--         descricao,
--         link,
--         observacao,
--         cidade,
--         uf,
--         lat,
--         lng,
--         site,
--         instagram,
--         facebook,
--         whatsapp,
--         email,
--         ativo,
--         created_at,
--         updated_at
--       from public.pesquisa_pontos_mapa
--     $v$;
--   end if;
-- end $$;
