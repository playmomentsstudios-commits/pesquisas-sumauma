import { escapeHtml } from "../utils.js";

export function renderMapaPesquisa(p, opts = {}){
  const slug = escapeHtml(p.slug);
  const csvUrl = escapeHtml(p?.mapa?.csvUrl || "");
  const openRelatorio = !!opts.openRelatorio;

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

    ${renderRelatorioModal(p, openRelatorio)}

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
        setTimeout(function(){
          if (window.SumaumaMap && window.SumaumaMap.init) {
            window.SumaumaMap.init(opts);
          }
        }, 0);
      })();
    </script>
  `;
}

function renderRelatorioModal(p, open){
  const cls = open ? "modal show" : "modal";
  const pdf = p.relatorioPdf ? escapeHtml(p.relatorioPdf) : "";

  return `
    <div class="${cls}" id="relatorioModal" aria-hidden="${open ? "false" : "true"}">
      <div class="modal-content">
        <span class="close" data-close-modal="1">×</span>

        <h3 style="margin:0 0 10px; color:#0f3d2e;">Relatório</h3>
        <p style="margin:0 0 12px; color:#555; line-height:1.6;">
          ${escapeHtml(p.sinopse || "Sinopse do relatório (editável no admin).")}
        </p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:10px;">
          ${pdf ? `<a class="btn primary" href="${pdf}" target="_blank" rel="noopener noreferrer">Ler</a>` : ""}
          ${pdf ? `<a class="btn light" href="${pdf}" download>Baixar</a>` : ""}
          <a class="btn light" href="/${escapeHtml(p.slug)}/mapa" data-link>Fechar</a>
        </div>
      </div>
    </div>

    <script>
      (function(){
        const modal = document.getElementById("relatorioModal");
        if(!modal) return;

        function close(){
          window.history.pushState({}, "", "/${escapeHtml(p.slug)}/mapa");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }

        modal.addEventListener("click", (e)=>{
          if(e.target === modal) close();
          const btn = e.target.closest("[data-close-modal]");
          if(btn) close();
        });

        document.addEventDeepKeyDown = document.addEventListener("keydown", (e)=>{
          if(e.key === "Escape" && modal.classList.contains("show")) close();
        });
      })();
    </script>
  `;
}
