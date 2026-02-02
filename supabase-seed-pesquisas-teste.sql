-- Seed: 2 pesquisas de teste
-- Execute no Supabase SQL Editor (com seu projeto selecionado)

-- Opcional: limpar pesquisas com esses slugs (para rodar várias vezes sem erro)
delete from public.pesquisas where slug in ('seguimento-negro','territorios-quilombolas');

insert into public.pesquisas
(slug, titulo, ano_base, ordem, descricao_curta, sinopse, status, csv_fallback, capa_url, relatorio_pdf_url, leitura_url, config_json)
values
(
  'seguimento-negro',
  'Seguimento Negro',
  '2025',
  1,
  'Pesquisa teste sobre articulações e dinâmicas do seguimento negro no território.',
  'Relatório (teste) — esta pesquisa é um seed para validar o portal multi-pesquisas.',
  true,
  '/public/data/mapeamento-seguimento-negro.csv',
  'https://placehold.co/1200x400/png?text=Seguimento+Negro+-+Capa',
  'https://example.com/relatorio-seguimento-negro.pdf',
  null,
  '{
    "pesquisaResumo":{
      "introducao":{"titulo":"Introdução","texto":"Conteúdo de teste para validar a página da pesquisa."},
      "citacao":{"texto":"A ancestralidade é caminho e presença.","autor":"— Teste"},
      "topicos":[
        {"titulo":"Tópico 1","texto":"Texto do tópico 1 (teste).","imagemKey":"pesquisa.img.1"},
        {"titulo":"Tópico 2","texto":"Texto do tópico 2 (teste).","imagemKey":"pesquisa.img.2"},
        {"titulo":"Tópico 3","texto":"Texto do tópico 3 (teste).","imagemKey":"pesquisa.img.3"},
        {"titulo":"Tópico 4","texto":"Texto do tópico 4 (teste).","imagemKey":"pesquisa.img.4"},
        {"titulo":"Tópico 5","texto":"Texto do tópico 5 (teste).","imagemKey":"pesquisa.img.5"},
        {"titulo":"Tópico 6","texto":"Texto do tópico 6 (teste).","imagemKey":"pesquisa.img.6"},
        {"titulo":"Tópico 7","texto":"Texto do tópico 7 (teste).","imagemKey":"pesquisa.img.7"},
        {"titulo":"Tópico 8","texto":"Texto do tópico 8 (teste).","imagemKey":"pesquisa.img.8"},
        {"titulo":"Tópico 9","texto":"Texto do tópico 9 (teste).","imagemKey":"pesquisa.img.9"},
        {"titulo":"Tópico 10","texto":"Texto do tópico 10 (teste).","imagemKey":"pesquisa.img.10"}
      ]
    },
    "fichaTecnica":{
      "realizacao":{"nome":"Instituto Sumaúma","logoKey":"ficha.realizacao.logo"},
      "financiador":{"nome":"Financiador (Teste)","logoKey":"ficha.financiador.logo"},
      "equipe":[
        {"nome":"Pessoa 1","funcao":"Coordenação","fotoKey":"ficha.equipe.1"},
        {"nome":"Pessoa 2","funcao":"Pesquisa","fotoKey":"ficha.equipe.2"},
        {"nome":"Pessoa 3","funcao":"Design","fotoKey":"ficha.equipe.3"}
      ]
    }
  }'::jsonb
),
(
  'territorios-quilombolas',
  'Territórios Quilombolas',
  '2025',
  2,
  'Pesquisa teste sobre territórios quilombolas e conexões culturais e comunicacionais.',
  'Relatório (teste) — esta pesquisa é um seed para validar o portal multi-pesquisas.',
  true,
  '/public/data/mapeamento-territorios-quilombolas.csv',
  'https://placehold.co/1200x400/png?text=Territorios+Quilombolas+-+Capa',
  'https://example.com/relatorio-territorios-quilombolas.pdf',
  null,
  '{
    "pesquisaResumo":{
      "introducao":{"titulo":"Introdução","texto":"Conteúdo de teste para validar a página da pesquisa."},
      "citacao":{"texto":"Território é memória viva e futuro em construção.","autor":"— Teste"},
      "topicos":[
        {"titulo":"Tópico 1","texto":"Texto do tópico 1 (teste).","imagemKey":"pesquisa.img.1"},
        {"titulo":"Tópico 2","texto":"Texto do tópico 2 (teste).","imagemKey":"pesquisa.img.2"},
        {"titulo":"Tópico 3","texto":"Texto do tópico 3 (teste).","imagemKey":"pesquisa.img.3"},
        {"titulo":"Tópico 4","texto":"Texto do tópico 4 (teste).","imagemKey":"pesquisa.img.4"},
        {"titulo":"Tópico 5","texto":"Texto do tópico 5 (teste).","imagemKey":"pesquisa.img.5"},
        {"titulo":"Tópico 6","texto":"Texto do tópico 6 (teste).","imagemKey":"pesquisa.img.6"},
        {"titulo":"Tópico 7","texto":"Texto do tópico 7 (teste).","imagemKey":"pesquisa.img.7"},
        {"titulo":"Tópico 8","texto":"Texto do tópico 8 (teste).","imagemKey":"pesquisa.img.8"},
        {"titulo":"Tópico 9","texto":"Texto do tópico 9 (teste).","imagemKey":"pesquisa.img.9"},
        {"titulo":"Tópico 10","texto":"Texto do tópico 10 (teste).","imagemKey":"pesquisa.img.10"}
      ]
    },
    "fichaTecnica":{
      "realizacao":{"nome":"Instituto Sumaúma","logoKey":"ficha.realizacao.logo"},
      "financiador":{"nome":"Financiador (Teste)","logoKey":"ficha.financiador.logo"},
      "equipe":[
        {"nome":"Pessoa 1","funcao":"Coordenação","fotoKey":"ficha.equipe.1"},
        {"nome":"Pessoa 2","funcao":"Pesquisa","fotoKey":"ficha.equipe.2"},
        {"nome":"Pessoa 3","funcao":"Comunicação","fotoKey":"ficha.equipe.3"}
      ]
    }
  }'::jsonb
);

-- Conferência
select id, slug, titulo, status, ordem, updated_at
from public.pesquisas
where slug in ('seguimento-negro','territorios-quilombolas')
order by ordem;
