import { escapeHtml } from "../utils.js";

export function renderMapaPesquisa(p, opts = {}){
  const slug = escapeHtml(p.slug);
  const csvUrl = escapeHtml(p?.mapa?.csvUrl || "");

  // submenus com ativo automático
  const path = (location.pathname || "").replace(/\/+$/,"");
  const active =
    path.endsWith(`/${slug}/pesquisa`) ? "pesquisa" :
    path.endsWith(`/${slug}/ficha-tecnica`) ? "ficha-tecnica" :
    path.endsWith(`/${slug}/relatorio`) ? "relatorio" :
    "mapa";

  const tab = (sub, label) => {
    const isActive = active === sub;
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="/${slug}/${sub}" data-link>${label}</a>`;
  };

  // IDs únicos (pra não conflitar)
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
          <div class="empty">Carregando dados…</div>
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
          mapId: "${mapId}",
          listId: "${listId}",
          searchId: "${searchId}",
          stateId: "${stateId}",
          cityId: "${cityId}",
          catId: "${catId}"
        };

        // inicia quando o DOM desta view existir
        setTimeout(function(){
          if (window.SumaumaMap && window.SumaumaMap.init) {
            window.SumaumaMap.init(opts);
          }
        }, 0);
      })();
    </script>
  `;
}
