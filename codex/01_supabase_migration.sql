-- CODEX Sumaúma — Migração (rodar no Supabase SQL Editor, se necessário)

alter table if exists public.pesquisas
  add column if not exists descricao_curta text,
  add column if not exists sinopse_relatorio text,
  add column if not exists capa_url text,
  add column if not exists relatorio_pdf_url text,
  add column if not exists banner_url text;

alter table if exists public.pesquisas
  add column if not exists mapa_csv_url text,
  add column if not exists mapa_csv_updated_at timestamptz;

create table if not exists public.pesquisa_pontos_mapa (
  id bigserial primary key,
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  titulo text not null,
  descricao text,
  categoria text,
  estado text,
  cidade text,
  latitude double precision not null,
  longitude double precision not null,
  cor text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pesquisa_pontos_mapa_pesquisa
  on public.pesquisa_pontos_mapa(pesquisa_id);

create table if not exists public.pesquisa_topicos (
  id bigserial primary key,
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  descricao text,
  imagem_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pesquisa_topicos_pesquisa
  on public.pesquisa_topicos(pesquisa_id);

create table if not exists public.pesquisa_ficha_tecnica (
  pesquisa_id uuid primary key references public.pesquisas(id) on delete cascade,
  realizacao_logo_url text,
  financiador_logo_url text,
  texto_realizacao text,
  texto_financiador text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pesquisa_equipe (
  id bigserial primary key,
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  ordem int not null default 0,
  nome text not null,
  funcao text,
  bio text,
  foto_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pesquisa_equipe_pesquisa
  on public.pesquisa_equipe(pesquisa_id);
