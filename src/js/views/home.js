import { escapeHtml } from "../utils.js";

export function renderHome(pesquisas){
  return `
    <section class="hero">
      <h1>Pesquisas</h1>
      <p>Selecione uma pesquisa no menu “Pesquisas” ou explore abaixo. Cada bloco contém acesso à página da pesquisa, relatório e mapa.</p>
    </section>

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
              <a class="btn primary" href="/${escapeHtml(p.slug)}" data-link>Ver</a>
              <a class="btn" href="/${escapeHtml(p.slug)}/relatorio" data-link>Relatório</a>
              <a class="btn" href="/${escapeHtml(p.slug)}/mapa" data-link>Mapa</a>
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
