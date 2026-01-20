import { fetchPesquisas, wireDropdown, spaLinkHandler, getSpaRedirect } from "./utils.js";
import { renderHome } from "./views/home.js";
import { renderMapaPesquisa } from "./views/mapa-pesquisa.js";
import { renderResumoPesquisa } from "./views/resumo-pesquisa.js";
import { renderFichaTecnica } from "./views/ficha-tecnica.js";

export async function initRouter(){
  const redirect = getSpaRedirect();
  if (redirect && redirect !== location.pathname) {
    history.replaceState({}, "", redirect);
  }

  const app = document.getElementById("app");
  const pesquisas = await fetchPesquisas();
  wireDropdown(pesquisas);

  document.addEventListener("click", (e) => spaLinkHandler(e, navigate));
  window.addEventListener("popstate", () => route());

  function navigate(path){
    history.pushState({}, "", path);
    route();
  }

  function notFound(){
    app.innerHTML = `
      <div class="hero">
        <h1 style="margin:0 0 10px;color:#0f3d2e;">Página não encontrada</h1>
        <p style="margin:0;">Esse endereço não corresponde a uma pesquisa cadastrada.</p>
        <div style="margin-top:14px">
          <a class="btn primary" href="/" data-link>Voltar</a>
        </div>
      </div>
    `;
  }

  function route(){
    const path = location.pathname.replace(/\/+$/,"") || "/";

    if (path === "/"){
      app.innerHTML = renderHome(pesquisas);
      return;
    }

    const parts = path.slice(1).split("/");
    const slug = parts[0];
    const sub = parts[1] || ""; // "", "pesquisa", "relatorio", "ficha-tecnica", "mapa"

    const item = pesquisas.find(p => p.slug === slug);
    if (!item){
      notFound();
      return;
    }

    // padrão /:slug => abre o MAPA (modelo antigo)
    if (sub === "" || sub === "mapa"){
      app.innerHTML = renderMapaPesquisa(item);
      return;
    }

    if (sub === "pesquisa"){
      app.innerHTML = renderResumoPesquisa(item);
      return;
    }

    if (sub === "ficha-tecnica"){
      app.innerHTML = renderFichaTecnica(item);
      return;
    }

    // relatorio abre modal dentro do mapa (pra ficar igual o projeto antigo)
    if (sub === "relatorio"){
      app.innerHTML = renderMapaPesquisa(item, { openRelatorio: true });
      return;
    }

    notFound();
  }

  route();
}
