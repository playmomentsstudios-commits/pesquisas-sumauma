-- 04_banners_site_pesquisa.sql
alter table if exists public.pesquisas
  add column if not exists banner_pos text,
  add column if not exists banner_overlay numeric;

-- defaults opcionais (não obrigatório, mas ajuda):
update public.pesquisas
set banner_pos = coalesce(banner_pos, 'center'),
    banner_overlay = coalesce(banner_overlay, 0.35)
where banner_pos is null or banner_overlay is null;

-- site_config já existe (02_site_config.sql). Vamos usar chaves:
-- home_banner_url (já usado)
-- home_banner_pos
-- home_banner_overlay
