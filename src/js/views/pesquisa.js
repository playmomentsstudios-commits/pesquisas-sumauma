import { escapeHtml } from "../utils.js";

export function renderPesquisa(p){
  return `
    <section class="page">
      <div class="page-banner">
        <img src="${escapeHtml(p.capa)}" alt="Banner da pesquisa: ${escapeHtml(p.titulo)}" />
        <div class="overlay"></div>
      </div>

      <div class="page-head">
        <div class="kicker">
          <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
          <span class="badge">Pesquisa</span>
        </div>

        <h2>${escapeHtml(p.titulo)}</h2>
        <p>${escapeHtml(p.resumo || "")}</p>

        <div class="card-actions" style="margin-top:6px">
          <a class="btn" href="/${escapeHtml(p.slug)}/relatorio" data-link>Abrir Relatório</a>
          <a class="btn" href="/${escapeHtml(p.slug)}/mapa" data-link>Ir para Mapa</a>
          <a class="btn linklike" href="/" data-link>Voltar</a>
        </div>

        <div style="margin-top:10px; color: rgba(255,255,255,.65); font-size:13px; line-height:1.5">
          <strong>Nota:</strong> essa página “Ver” é a base do módulo <em>Pesquisa</em> (subcategoria dentro de cada pesquisa).
          Depois a gente conecta aqui os tópicos do sumário com imagem horizontal (editável no admin).
        </div>
      </div>
    </section>
  `;
}
