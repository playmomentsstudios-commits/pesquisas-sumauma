-- Supabase schema para portal multi-pesquisas
-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- Tabela principal de pesquisas
create table if not exists public.pesquisas (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  titulo text not null,
  "anoBase" text,
  capa_url text,
  relatorio_pdf_url text,
  relatorio_leitura_url text,
  "descricaoCurta" text,
  sinopse text,
  status boolean default true,
  ordem int default 0,
  config_json jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Conteúdos estruturados (opcional)
create table if not exists public.pesquisa_conteudo (
  id uuid primary key default uuid_generate_v4(),
  pesquisa_id uuid references public.pesquisas(id) on delete cascade,
  key text not null,
  value text,
  unique(pesquisa_id, key)
);

create table if not exists public.pesquisa_midia (
  id uuid primary key default uuid_generate_v4(),
  pesquisa_id uuid references public.pesquisas(id) on delete cascade,
  key text not null,
  url text,
  alt text,
  unique(pesquisa_id, key)
);

create table if not exists public.pesquisa_relatorio (
  pesquisa_id uuid primary key references public.pesquisas(id) on delete cascade,
  pdf_url text,
  leitura_url text,
  updated_at timestamptz default now()
);

create table if not exists public.pontos (
  id uuid primary key default uuid_generate_v4(),
  pesquisa_id uuid references public.pesquisas(id) on delete cascade,
  nome text not null,
  cidade text,
  uf text,
  categoria text,
  lat numeric,
  lng numeric,
  descricao text,
  site text,
  instagram text,
  facebook text,
  whatsapp text,
  email text,
  ativo boolean default true
);

-- RLS
alter table public.pesquisas enable row level security;
alter table public.pesquisa_conteudo enable row level security;
alter table public.pesquisa_midia enable row level security;
alter table public.pesquisa_relatorio enable row level security;
alter table public.pontos enable row level security;

-- Leitura pública
create policy "Public read pesquisas" on public.pesquisas
  for select using (true);
create policy "Public read pesquisa_conteudo" on public.pesquisa_conteudo
  for select using (true);
create policy "Public read pesquisa_midia" on public.pesquisa_midia
  for select using (true);
create policy "Public read pesquisa_relatorio" on public.pesquisa_relatorio
  for select using (true);
create policy "Public read pontos" on public.pontos
  for select using (true);

-- Escrita apenas autenticado
create policy "Auth write pesquisas" on public.pesquisas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write pesquisa_conteudo" on public.pesquisa_conteudo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write pesquisa_midia" on public.pesquisa_midia
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write pesquisa_relatorio" on public.pesquisa_relatorio
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write pontos" on public.pontos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage bucket: criar bucket site-assets como public no painel do Supabase
