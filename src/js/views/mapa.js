import { escapeHtml } from "../utils.js";

export function renderMapa(p){
  // placeholder: depois conecta Leaflet + CSV + filtros etc.
  return `
    <section class="hero">
      <h1>Mapa</h1>
      <p><strong>${escapeHtml(p.titulo)}</strong> — Ano base: ${escapeHtml(p.anoBase || "")}</p>
      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap">
        <a class="btn linklike" href="/${escapeHtml(p.slug)}" data-link>Voltar</a>
        <a class="btn" href="/${escapeHtml(p.slug)}/relatorio" data-link>Relatório</a>
      </div>
    </section>

    <section class="page" style="margin-top:16px">
      <div class="page-head">
        <h2>Mapa interativo (OpenStreetMap)</h2>
        <p>
          Aqui entra o Leaflet + OpenStreetMap consumindo os dados (depois do admin/banco).
          Por enquanto é a base da rota “/mapa”.
        </p>

        <div style="margin-top:12px; color: rgba(255,255,255,.65); font-size:13px; line-height:1.5">
          <strong>Próximo passo (quando formos pro mapa):</strong> ler CSV/DB, montar marcadores por categoria
          (Prática Cultural / Prática Comunicacional), filtros e busca.
        </div>
      </div>
    </section>
  `;
}
