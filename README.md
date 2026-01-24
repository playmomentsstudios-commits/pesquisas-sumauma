# Pesquisas – Instituto Sumaúma

Home: https://pesquisa.sumauma.org  
Institucional: https://sumauma.org

## Rodar local
Se você tiver qualquer servidor simples (ex.: VSCode Live Server), abra o `index.html`.

## Supabase (multi-pesquisas)
1. Crie um projeto no Supabase.
2. Execute o SQL do arquivo `supabase-multi.sql` no editor SQL do Supabase.
3. Crie o bucket **site-assets** como **public** no Storage.
4. Crie um usuário admin em **Auth > Users** (email/senha).
5. Copie `js/supabase-config.example.js` para `js/supabase-config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` (usado no site público).
6. Acesse `/admin/` para usar o painel administrativo.

> O site público continua funcionando com `public/data/pesquisas.json` e CSVs se o Supabase não estiver configurado.

## Testes (Netlify)
1. No site publicado, abrir a HOME e inspecionar o console.
2. Confirmar o log: `[HOME] Supabase OK, carregando pesquisas do DB`.
3. Garantir que a listagem traga **Seguimento Negro** e **Territórios Quilombolas**.
4. Clicar e validar navegação SPA para `/seguimento-negro` e `/territorios-quilombolas`.
5. Simular indisponibilidade do Supabase e confirmar fallback com log `[HOME] Fallback JSON local (...)`.

## Deploy
### Netlify (recomendado)
1. **New site from Git** e selecione este repositório.
2. Use as configurações do `netlify.toml` (publish `.` e comando vazio).
3. Faça o deploy e teste as rotas:
   - `/`
   - `/:slug` (ex.: `/corpos-territorios`)
   - `/:slug/mapa`
   - `/admin/`

> O arquivo `_redirects` garante o fallback de SPA para `index.html`.

### GitHub Pages
- Ative Pages para a branch `main` / root.
- O arquivo `404.html` já faz o fallback das rotas limpas.
