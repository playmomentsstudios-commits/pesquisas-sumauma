# Pesquisas – Instituto Sumaúma

Home: https://pesquisa.sumauma.org  
Institucional: https://sumauma.org

## Rodar local
Se você tiver qualquer servidor simples (ex.: VSCode Live Server), abra o `index.html`.

## Deploy
### Vercel/Netlify (recomendado)
Configure rewrite para `index.html` (SPA).
- Netlify: `_redirects` com `/* /index.html 200`
- Vercel: `vercel.json` com rewrite para `/`

### GitHub Pages
- Ative Pages para a branch `main` / root.
- O arquivo `404.html` já faz o fallback das rotas limpas.
