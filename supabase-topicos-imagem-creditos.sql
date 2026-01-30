-- Adiciona coluna para créditos da imagem nos tópicos
alter table if exists public.topicos
  add column if not exists imagem_creditos text;
