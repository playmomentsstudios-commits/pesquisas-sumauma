-- habilitar extensão (se precisar)
create extension if not exists pgcrypto;

alter table if exists public.pesquisas enable row level security;

-- colunas
alter table public.pesquisas add column if not exists ano_base text;
alter table public.pesquisas add column if not exists ordem int default 0;
alter table public.pesquisas add column if not exists descricao_curta text;
alter table public.pesquisas add column if not exists sinopse text;
alter table public.pesquisas add column if not exists status boolean default true;
alter table public.pesquisas add column if not exists capa_url text;
alter table public.pesquisas add column if not exists relatorio_pdf_url text;
alter table public.pesquisas add column if not exists leitura_url text;
alter table public.pesquisas add column if not exists csv_fallback text;
alter table public.pesquisas add column if not exists config_json jsonb;
alter table public.pesquisas add column if not exists updated_at timestamptz default now();

-- unique slug
create unique index if not exists pesquisas_slug_unique on public.pesquisas (slug);

-- updated_at trigger (opcional)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pesquisas_updated_at on public.pesquisas;
create trigger trg_pesquisas_updated_at
before update on public.pesquisas
for each row execute function public.set_updated_at();

-- policies
drop policy if exists "pesquisas_select_public" on public.pesquisas;
create policy "pesquisas_select_public"
on public.pesquisas for select
to anon, authenticated
using (true);

drop policy if exists "pesquisas_write_auth" on public.pesquisas;
create policy "pesquisas_write_auth"
on public.pesquisas for all
to authenticated
using (true)
with check (true);
