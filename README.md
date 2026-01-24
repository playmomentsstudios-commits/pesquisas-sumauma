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
5. Copie `src/js/supabase-config.example.js` para `src/js/supabase-config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
6. Acesse `/admin/` para usar o painel administrativo.

> O site público continua funcionando com `public/data/pesquisas.json` e CSVs se o Supabase não estiver configurado.

## Deploy
### Vercel/Netlify (recomendado)
Configure rewrite para `index.html` (SPA).
- Netlify: `_redirects` com `/* /index.html 200`
- Vercel: `vercel.json` com rewrite para `/`

### GitHub Pages
- Ative Pages para a branch `main` / root.
- O arquivo `404.html` já faz o fallback das rotas limpas.
