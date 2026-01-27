-- ============================================================
-- SUPABASE POLICIES — LEITURA PÚBLICA PARA MAPA
-- Use se: ADM vê pontos, mas público não vê (provável RLS)
-- ============================================================

-- 1) Pesquisas: permitir SELECT público (para resolver id via slug)
alter table if exists public.pesquisas enable row level security;

drop policy if exists "Public can read pesquisas" on public.pesquisas;
create policy "Public can read pesquisas"
on public.pesquisas for select
to anon, authenticated
using (true);

-- 2) Pontos: permitir SELECT público somente dos ativos
alter table if exists public.pontos enable row level security;

drop policy if exists "Public can read pontos ativos" on public.pontos;
create policy "Public can read pontos ativos"
on public.pontos for select
to anon, authenticated
using (ativo = true);

-- (Opcional) manter INSERT/UPDATE/DELETE só autenticado (se você já tem policies do ADM)
