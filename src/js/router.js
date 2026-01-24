import { fetchPesquisasPublic, wireDropdown, spaLinkHandler, getSpaRedirect } from "./utils.js";
import { getBasePath, withBase } from "./basepath.js";
import { renderHome } from "./views/home.js";
import { renderMapaPesquisa } from "./views/mapa-pesquisa.js";
import { renderResumoPesquisa } from "./views/resumo-pesquisa.js";
import { renderFichaTecnica } from "./views/ficha-tecnica.js";

export async function initRouter(){
  const app = document.getElementById("app");
  function getCleanPathname(){
    const base = getBasePath();
    let p = location.pathname || "/";
    if (base && p.startsWith(base)) {
      p = p.slice(base.length);
    }
    if (!p.startsWith("/")) p = "/" + p;
    return p;
  }

  try {
    const redirect = getSpaRedirect();
    if (redirect && redirect !== location.pathname) {
      history.replaceState({}, "", redirect);
    }

    const pesquisas = await fetchPesquisasPublic();
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
          <p style="margin:0;color:#555;line-height:1.7;">Esse endereço não corresponde a uma pesquisa cadastrada.</p>
          <div style="margin-top:14px">
            <a class="btn primary" href="${withBase("/")}" data-link>Voltar</a>
          </div>
        </div>
      `;
    }

    function route(){
      const path = getCleanPathname().replace(/\/+$/,"") || "/";

      if (path === "/"){
        app.innerHTML = renderHome(pesquisas);
        return;
      }

      const parts = path.slice(1).split("/");
      const slug = parts[0];
      const sub = parts[1] || "";

      const item = pesquisas.find(p => p.slug === slug);
      if (!item){
        notFound();
        return;
      }

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
      if (sub === "relatorio"){
        app.innerHTML = renderMapaPesquisa(item, { openRelatorio: true });
        return;
      }

      notFound();
    }

    route();

  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <div class="hero">
        <h1 style="margin:0 0 10px;color:#0f3d2e;">Erro ao carregar o site</h1>
        <p style="margin:0;color:#555;line-height:1.7;">
          Não foi possível carregar os dados das pesquisas.
        </p>
        <p style="margin-top:10px;color:#666;font-size:13px;line-height:1.6;">
          Verifique se existe o arquivo <b>public/data/pesquisas.json</b> e se o caminho está correto.
        </p>
      </div>
    `;
  }
}
