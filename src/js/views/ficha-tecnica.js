import { escapeHtml } from "../utils.js";

export function renderFichaTecnica(p){
  return `
    <div class="hero">
      <h1 style="margin:0 0 10px;color:#0f3d2e;">Ficha Técnica</h1>
      <p style="margin:0;color:#555;line-height:1.7;">
        <strong>${escapeHtml(p.titulo)}</strong> — aqui vamos inserir o mesmo layout que ficou perfeito (realização, financiador, equipe com cards).
      </p>

      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn light" href="/${escapeHtml(p.slug)}/mapa" data-link>Voltar ao Mapa</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/pesquisa" data-link>Pesquisa</a>
        <a class="btn light" href="/${escapeHtml(p.slug)}/relatorio" data-link>Relatório</a>
      </div>
    </div>
  `;
}
