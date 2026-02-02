import { escapeHtml, loadPesquisas } from "../utils.js";
import { withBase } from "../basepath.js";

async function renderHome(){
  const pesquisas = await loadPesquisas(false);

  return `
    <section class="home-grid" aria-label="Lista de pesquisas">
      ${pesquisas.map(p => {
        const href = escapeHtml(withBase("/" + p.slug + "/pesquisa"));
        const titulo = escapeHtml(p.titulo || "Pesquisa");
        const ano = escapeHtml(p.anoBase || "");
        const capa = p.capa ? escapeHtml(p.capa) : "";
        return `
          <article class="home-card">
            <a class="home-card-cover" href="${href}" data-link aria-label="Ver pesquisa: ${titulo}">
              ${capa ? `<img src="${capa}" alt="Capa da pesquisa: ${titulo}" loading="lazy" />` : ""}
            </a>

            <div class="home-card-body">
              ${ano ? `<span class="home-chip">Ano base: ${ano}</span>` : ""}

              <h3 class="home-card-title">
                <a href="${href}" data-link>${titulo}</a>
              </h3>

              <div class="home-card-actions">
                <a class="home-btn" href="${href}" data-link>Ver pesquisa</a>
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
