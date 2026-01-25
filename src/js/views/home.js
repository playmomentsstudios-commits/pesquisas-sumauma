import { escapeHtml, loadPesquisas } from "../utils.js";
import { withBase } from "../basepath.js";

async function renderHome(){
  const pesquisas = await loadPesquisas(false);
  return `
    <section class="grid" aria-label="Lista de pesquisas">
      ${pesquisas.map(p => `
        <article class="card">
          <div class="card-cover">
            <img src="${escapeHtml(p.capa)}" alt="Capa da pesquisa: ${escapeHtml(p.titulo)}" />
          </div>

          <div class="card-body">
            <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
            <h3 class="card-title">${escapeHtml(p.titulo)}</h3>

            <div class="card-actions">
              <a class="btn primary" href="${escapeHtml(withBase("/" + p.slug))}" data-link>Ver</a>
              <a class="btn light" href="${escapeHtml(withBase("/" + p.slug + "/relatorio"))}" data-link>Relatório</a>
              <a class="btn light" href="${escapeHtml(withBase("/" + p.slug + "/mapa"))}" data-link>Mapa</a>
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

export default renderHome;
export { renderHome };
