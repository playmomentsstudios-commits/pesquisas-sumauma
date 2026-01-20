import { escapeHtml } from "../utils.js";

export function renderMapaPesquisa(p, opts = {}){
  const openRelatorio = !!opts.openRelatorio;

  const slug = escapeHtml(p.slug);
  const path = (location.pathname || "").replace(/\/+$/,"");

  // qual aba está ativa?
  const active =
    path.endsWith(`/${slug}/pesquisa`) ? "pesquisa" :
    path.endsWith(`/${slug}/ficha-tecnica`) ? "ficha-tecnica" :
    path.endsWith(`/${slug}/relatorio`) ? "relatorio" :
    "mapa";

  return `
    <div class="subbar">
      <div class="subbar-right">
        ${tab(slug, "mapa", "Mapa", active === "mapa")}
        ${tab(slug, "pesquisa", "Pesquisa", active === "pesquisa")}
        ${tab(slug, "relatorio", "Relatório", active === "relatorio")}
        ${tab(slug, "ficha-tecnica", "Ficha Técnica", active === "ficha-tecnica")}
      </div>
    </div>

    <div class="layout-mapa">
      <aside class="sidebar">
        <div class="sidebar-head">
          <h3>Mapeamento</h3>
          <p>Busque e filtre os participantes (layout baseado no modelo aprovado).</p>
        </div>

        <div class="filters">
          <input class="field" type="text" placeholder="Buscar por nome..." />
          <select class="field"><option>Todos os estados</option></select>
          <select class="field"><option>Todas as cidades</option></select>
          <select class="field">
            <option>Todas as categorias</option>
            <option>Prática Cultural</option>
            <option>Prática Comunicacional</option>
          </select>
        </div>

        <div class="list">
          <div class="list-item">
            <strong>Exemplo de participante</strong>
            <small>Território • Cidade/UF • Categoria</small>
          </div>
        </div>
      </aside>

      <section class="maparea">
        <div class="map-placeholder">
          <div>
            <strong>Mapa (OpenStreetMap)</strong>
            <p>Próximo passo: ligar Leaflet + leitura do CSV/DB.</p>
          </div>
        </div>
      </section>
    </div>

    ${renderRelatorioModal(p, openRelatorio)}
  `;
}

function tab(slug, sub, label, isActive){
  const href = `/${slug}/${sub}`;
  const cls = isActive ? "tab tab-active" : "tab tab-idle";
  return `<a class="${cls}" href="${href}" data-link>${label}</a>`;
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

        document.addEventListener("keydown", (e)=>{
          if(e.key === "Escape" && modal.classList.contains("show")) close();
        });
      })();
    </script>
  `;
}
