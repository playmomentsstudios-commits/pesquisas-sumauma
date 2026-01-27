import { escapeHtml } from "../utils.js";
import { getBasePath, withBase } from "../basepath.js";

async function renderMapaPesquisa(p){
  const slug = escapeHtml(p.slug);
  const rawCsvUrl = p?.mapa?.csvUrl || "";
  const csvUrlBase = escapeHtml(rawCsvUrl);
  const csvUrl = csvUrlBase
    ? `${csvUrlBase}${csvUrlBase.includes("?") ? "&" : "?"}v=${Date.now()}`
    : "";
  const pesquisaId = p?.dbId || p?._dbId || "";
  const supabaseEnabled = true;

  const base = getBasePath();
  let path = (location.pathname || "").replace(/\/+$/,"");
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  const active =
    path.endsWith(`/${slug}/pesquisa`) ? "pesquisa" :
    path.endsWith(`/${slug}/ficha-tecnica`) ? "ficha-tecnica" :
    path.endsWith(`/${slug}/relatorio`) ? "relatorio" :
    "mapa";

  const tab = (sub, label) => {
    const isActive = active === sub;
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="${withBase(`/${slug}/${sub}`)}" data-link>${label}</a>`;
  };

  const mapId = `map-${slug}`;
  const listId = `list-${slug}`;
  const searchId = `search-${slug}`;
  const stateId = `state-${slug}`;
  const cityId = `city-${slug}`;
  const catId = `cat-${slug}`;

  return `
    <div class="subbar">
      <div class="subbar-right">
        ${tab("mapa","Mapa")}
        ${tab("pesquisa","Pesquisa")}
        ${tab("relatorio","Relatório")}
        ${tab("ficha-tecnica","Ficha Técnica")}
      </div>
    </div>

    <div class="layout-mapa">
      <aside class="sidebar">
        <div class="sidebar-head">
          <h3>Mapeamento</h3>
          <p>Busque e filtre os participantes.</p>
        </div>

        <div class="filters">
          <input id="${searchId}" class="field" type="text" placeholder="Buscar por nome..." />
          <select id="${stateId}" class="field"><option value="">Todos os estados</option></select>
          <select id="${cityId}" class="field"><option value="">Todas as cidades</option></select>
          <select id="${catId}" class="field"><option value="">Todas as categorias</option></select>
        </div>

        <div id="${listId}" class="list">
          <div class="empty">${csvUrl || supabaseEnabled ? "Carregando dados…" : "Sem dados de mapa cadastrados."}</div>
        </div>
      </aside>

      <section class="maparea">
        <div id="${mapId}" class="leaflet-map"></div>
      </section>
    </div>

    <script>
      (function(){
        const opts = {
          csvUrl: "${csvUrl}",
          pesquisaId: "${escapeHtml(pesquisaId)}",
          supabaseEnabled: ${supabaseEnabled ? "true" : "false"},
          pesquisaSlug: "${slug}",
          mapId: "${mapId}",
          listId: "${listId}",
          searchId: "${searchId}",
          stateId: "${stateId}",
          cityId: "${cityId}",
          catId: "${catId}"
        };
        setTimeout(function(){
          if (!opts.csvUrl && !opts.supabaseEnabled) {
            return;
          }
          if (window.SumaumaMap && window.SumaumaMap.init) {
            window.SumaumaMap.init(opts);
          }
        }, 0);
      })();
    </script>
  `;
}

export default renderMapaPesquisa;
export { renderMapaPesquisa };
