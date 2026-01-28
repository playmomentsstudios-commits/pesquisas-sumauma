-- ============================================================
-- Se você usa a tabela "pesquisa_pontos_mapa" no Supabase,
-- crie esta VIEW para que o front/adm (que usa "pontos") funcione.
-- Rode no Supabase SQL Editor.
-- ============================================================

-- Ajuste nomes de colunas aqui se sua tabela tiver colunas diferentes
create or replace view public.pontos as
select
  id,
  pesquisa_id,
  nome,
  categoria,
  territorio,
  contato,
  descricao,
  link,
  observacao,
  cidade,
  uf,
  lat,
  lng,
  site,
  instagram,
  facebook,
  whatsapp,
  email,
  ativo,
  created_at,
  updated_at
from public.pesquisa_pontos_mapa;
