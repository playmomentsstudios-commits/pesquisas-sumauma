import { escapeHtml } from "../utils.js";

export function renderMapaPesquisa(p, opts = {}){
  const openRelatorio = !!opts.openRelatorio;

  return `
    <div class="pesquisa-top">
      <div class="pesquisa-title">
        <h2>${escapeHtml(p.titulo)}</h2>
        <div class="pesquisa-sub">
          <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
        </div>
      </div>

      <div class="pesquisa-menu">
        <a class="btn light" href="/" data-link>Início</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/mapa" data-link>Mapa</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/pesquisa" data-link>Pesquisa</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/relatorio" data-link>Relatório</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/ficha-tecnica" data-link>Ficha Técnica</a>
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
          <select class="field">
            <option>Todos os estados</option>
          </select>
          <select class="field">
            <option>Todas as cidades</option>
          </select>
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
          <div class="list-item">
            <strong>Outro participante</strong>
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
