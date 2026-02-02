-- ============================================================
-- SITE CONFIG (Supabase)
-- Tabela para configurar coisas globais do site (ex: banner da Home)
-- Rode no Supabase SQL Editor
-- ============================================================

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

-- RLS
alter table public.site_config enable row level security;

-- Leitura pública (o site precisa ler o banner)
drop policy if exists "Public can read site_config" on public.site_config;
create policy "Public can read site_config"
on public.site_config for select
to anon, authenticated
using (true);

-- Escrita apenas autenticado (ADM)
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
