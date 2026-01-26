import { escapeHtml, loadPesquisas } from "../utils.js";
import { withBase } from "../basepath.js";

async function renderHome(){
  const pesquisas = await loadPesquisas(false);
  return `
    <section class="grid" aria-label="Lista de pesquisas">
      ${pesquisas.map(p => `
        <article class="card">
          <div class="card-cover">
            ${p.capa ? `<img src="${escapeHtml(p.capa)}" alt="Capa da pesquisa: ${escapeHtml(p.titulo)}" onerror="this.style.display='none'" />` : ""}
          </div>

          <div class="card-body">
            <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
            <h3 class="card-title">${escapeHtml(p.titulo)}</h3>

            <div class="card-actions">
              <a class="btn primary" href="${escapeHtml(withBase("/" + p.slug + "/mapa"))}" data-link>Ver Pesquisa</a>
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

export default renderHome;
export { renderHome };
