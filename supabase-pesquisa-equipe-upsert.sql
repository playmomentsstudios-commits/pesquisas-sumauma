do $$
declare
  -- =========================================================
  -- 1) DEFINA A PESQUISA AQUI
  -- Escolha 1 (preferível): slug
  v_pesquisa_slug   text := 'relatorio-corpos-territorios-quilombolas-e-o-fio-conectado-da-ancestralidade';

  -- Escolha 2 (alternativa): título exato (se não souber o slug)
  v_pesquisa_titulo text := 'Corpos-territórios quilombolas e o fio conectado da ancestralidade';
  -- =========================================================

  v_pesquisa_id uuid;

begin
  /* =========================================================
     2) ENCONTRA O ID DA PESQUISA (tentando tabelas/colunas comuns)
     - Primeiro tenta por slug; se não achar, tenta por título.
  ========================================================= */

  -- Tentativa A: tabela "pesquisas"
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pesquisas') then

    -- tenta achar coluna "slug"
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='pesquisas' and column_name='slug'
    ) then
      execute 'select id from public.pesquisas where slug = $1 limit 1'
      into v_pesquisa_id
      using v_pesquisa_slug;
    end if;

    -- se não achou por slug, tenta por título
    if v_pesquisa_id is null and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='pesquisas' and column_name in ('titulo','title','nome','name')
    ) then
      -- tenta coluna "titulo"
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='pesquisas' and column_name='titulo'
      ) then
        execute 'select id from public.pesquisas where titulo = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      elsif exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='pesquisas' and column_name='title'
      ) then
        execute 'select id from public.pesquisas where title = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      elsif exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='pesquisas' and column_name='nome'
      ) then
        execute 'select id from public.pesquisas where nome = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      elsif exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='pesquisas' and column_name='name'
      ) then
        execute 'select id from public.pesquisas where name = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      end if;
    end if;

  end if;

  -- Tentativa B: tabela "pesquisa" (singular) — caso exista no seu schema
  if v_pesquisa_id is null and exists (select 1 from information_schema.tables where table_schema='public' and table_name='pesquisa') then

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='pesquisa' and column_name='slug'
    ) then
      execute 'select id from public.pesquisa where slug = $1 limit 1'
      into v_pesquisa_id
      using v_pesquisa_slug;
    end if;

    if v_pesquisa_id is null then
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pesquisa' and column_name='titulo') then
        execute 'select id from public.pesquisa where titulo = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='pesquisa' and column_name='title') then
        execute 'select id from public.pesquisa where title = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='pesquisa' and column_name='nome') then
        execute 'select id from public.pesquisa where nome = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='pesquisa' and column_name='name') then
        execute 'select id from public.pesquisa where name = $1 limit 1'
        into v_pesquisa_id
        using v_pesquisa_titulo;
      end if;
    end if;

  end if;

  if v_pesquisa_id is null then
    raise exception 'Não encontrei a pesquisa pelo slug (%) nem pelo título (%). Ajuste v_pesquisa_slug/v_pesquisa_titulo.', v_pesquisa_slug, v_pesquisa_titulo;
  end if;

  /* =========================================================
     3) UPSERT NA TABELA "PESQUISA_EQUIPE" (ou variações)
     - Atualiza/insere os integrantes somente dessa pesquisa.
  ========================================================= */

  -- Caso 1: tabela "pesquisa_equipe"
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pesquisa_equipe') then

    -- garante que existe uma "chave" de upsert (pesquisa_id + nome) via unique index
    -- se já existir, o CREATE falha? não, usamos IF NOT EXISTS no índice.
    execute 'create unique index if not exists uq_pesquisa_equipe_pesquisa_nome on public.pesquisa_equipe (pesquisa_id, nome)';

    insert into public.pesquisa_equipe (pesquisa_id, nome, linkedin)
    values
      (v_pesquisa_id, 'Felipe da Costa Souza', 'https://www.linkedin.com/in/fedesigner/'),
      (v_pesquisa_id, 'Juliane Sousa',         'https://www.linkedin.com/in/sousajuliane/'),
      (v_pesquisa_id, 'Maria Fernanda Ruas',   'https://www.linkedin.com/in/amaferuas/'),
      (v_pesquisa_id, 'Taís Oliveira',         'https://www.linkedin.com/in/taisso/'),
      (v_pesquisa_id, 'Abraão Filipe Oliveira','https://www.linkedin.com/in/abraao-filipe-oliveira-7b842a3a/'),
      (v_pesquisa_id, 'Vanessa Silva',         'https://www.linkedin.com/in/vanessasilva-st/'),
      (v_pesquisa_id, 'Diego Galofero',        'https://www.linkedin.com/in/galofero/'),
      (v_pesquisa_id, 'Anicely Santos',        'https://www.linkedin.com/in/anicelysantos/')
    on conflict (pesquisa_id, nome)
    do update set linkedin = excluded.linkedin;

    raise notice 'OK: Atualizei/Inseri equipe em public.pesquisa_equipe para pesquisa_id=%', v_pesquisa_id;

  -- Caso 2: tabela "pesquisa_integrantes"
  elsif exists (select 1 from information_schema.tables where table_schema='public' and table_name='pesquisa_integrantes') then

    execute 'create unique index if not exists uq_pesquisa_integrantes_pesquisa_nome on public.pesquisa_integrantes (pesquisa_id, nome)';

    insert into public.pesquisa_integrantes (pesquisa_id, nome, linkedin)
    values
      (v_pesquisa_id, 'Felipe da Costa Souza', 'https://www.linkedin.com/in/fedesigner/'),
      (v_pesquisa_id, 'Juliane Sousa',         'https://www.linkedin.com/in/sousajuliane/'),
      (v_pesquisa_id, 'Maria Fernanda Ruas',   'https://www.linkedin.com/in/amaferuas/'),
      (v_pesquisa_id, 'Taís Oliveira',         'https://www.linkedin.com/in/taisso/'),
      (v_pesquisa_id, 'Abraão Filipe Oliveira','https://www.linkedin.com/in/abraao-filipe-oliveira-7b842a3a/'),
      (v_pesquisa_id, 'Vanessa Silva',         'https://www.linkedin.com/in/vanessasilva-st/'),
      (v_pesquisa_id, 'Diego Galofero',        'https://www.linkedin.com/in/galofero/'),
      (v_pesquisa_id, 'Anicely Santos',        'https://www.linkedin.com/in/anicelysantos/')
    on conflict (pesquisa_id, nome)
    do update set linkedin = excluded.linkedin;

    raise notice 'OK: Atualizei/Inseri equipe em public.pesquisa_integrantes para pesquisa_id=%', v_pesquisa_id;

  else
    raise exception 'Não encontrei tabela public.pesquisa_equipe nem public.pesquisa_integrantes. Me diga o nome exato da tabela do "Pesquisa Equipe".';
  end if;

end $$;
