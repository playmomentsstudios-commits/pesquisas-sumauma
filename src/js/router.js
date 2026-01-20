import { fetchPesquisas, wireDropdown, spaLinkHandler, getSpaRedirect } from "./utils.js";
import { renderHome } from "./views/home.js";
import { renderPesquisa } from "./views/pesquisa.js";
import { renderRelatorio } from "./views/relatorio.js";
import { renderMapa } from "./views/mapa.js";

export async function initRouter(){
  // GH Pages fallback: recupera path salvo pelo 404.html
  const redirect = getSpaRedirect();
  if (redirect && redirect !== location.pathname) {
    history.replaceState({}, "", redirect);
  }

  const app = document.getElementById("app");

  // Carrega pesquisas (fonte atual: JSON)
  const pesquisas = await fetchPesquisas();

  // Dropdown
  wireDropdown(pesquisas);

  // Intercepta links internos do SPA
  document.addEventListener("click", (e) => spaLinkHandler(e, navigate));

  // Navegação por back/forward
  window.addEventListener("popstate", () => route());

  function navigate(path){
    history.pushState({}, "", path);
    route();
  }

  function route(){
    const path = location.pathname.replace(/\/+$/,"") || "/";

    // Home
    if (path === "/"){
      app.innerHTML = renderHome(pesquisas);
      return;
    }

    // /:slug
    const slug = path.slice(1);

    // subrotas: /:slug/relatorio , /:slug/mapa
    const parts = slug.split("/");
    const baseSlug = parts[0];
    const sub = parts[1] || "";

    const item = pesquisas.find(p => p.slug === baseSlug);

    if (!item){
      app.innerHTML = `
        <section class="hero">
          <h1>Página não encontrada</h1>
          <p>Esse endereço não corresponde a uma pesquisa cadastrada.</p>
          <div style="margin-top:14px">
            <a class="btn" href="/" data-link>Voltar para Pesquisas</a>
          </div>
        </section>
      `;
      return;
    }

    if (sub === "relatorio"){
      app.innerHTML = renderRelatorio(item);
      return;
    }

    if (sub === "mapa"){
      app.innerHTML = renderMapa(item);
      return;
    }

    // padrão: /:slug => “Ver” (pagina da pesquisa / resumo)
    app.innerHTML = renderPesquisa(item);
  }

  route();
}
