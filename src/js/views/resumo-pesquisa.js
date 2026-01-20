import { escapeHtml } from "../utils.js";

export function renderResumoPesquisa(p){
  return `
    <div class="hero">
      <h1 style="margin:0 0 10px;color:#0f3d2e;">Pesquisa</h1>
      <p style="margin:0;color:#555;line-height:1.7;">
        <strong>${escapeHtml(p.titulo)}</strong> — aqui entra o resumo por tópicos (cada tópico com imagem horizontal),
        igual vocês já usavam. Isso vai ser 100% editável no Admin depois.
      </p>

      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn light" href="/${escapeHtml(p.slug)}/mapa" data-link>Voltar ao Mapa</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/relatorio" data-link>Relatório</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/ficha-tecnica" data-link>Ficha Técnica</a>
      </div>
    </div>
  `;
}
