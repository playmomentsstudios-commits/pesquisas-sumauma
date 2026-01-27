import { escapeHtml, loadPesquisas } from "../utils.js";
import { withBase } from "../basepath.js";

async function renderHome(){
  const pesquisas = await loadPesquisas(false);

  return `
    <section class="grid" aria-label="Lista de pesquisas">
      ${pesquisas.map(p => {
        const href = escapeHtml(withBase("/" + p.slug + "/mapa"));
        const titulo = escapeHtml(p.titulo);
        const capa = p.capa ? `<img src="${escapeHtml(p.capa)}" alt="Capa da pesquisa: ${titulo}" onerror="this.style.display='none'" />` : "";
        return `
          <article class="card">
            <a class="card-cover" href="${href}" data-link aria-label="Abrir pesquisa: ${titulo}">
              ${capa}
            </a>

            <div class="card-body">
              <h3 class="card-title">
                <a href="${href}" data-link>${titulo}</a>
              </h3>

              <p class="card-meta">Ano base: ${escapeHtml(p.anoBase || "")}</p>

              <div class="card-actions">
                <a class="btn primary" href="${href}" data-link>Ver Pesquisa</a>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </section>
  `;
}

export default renderHome;
export { renderHome };
