import { escapeHtml } from "../utils.js";

export function renderRelatorio(p){
  const pdf = p.relatorioPdf || "";
  return `
    <section class="hero">
      <h1>Relatório</h1>
      <p><strong>${escapeHtml(p.titulo)}</strong> — Ano base: ${escapeHtml(p.anoBase || "")}</p>
      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap">
        <a class="btn linklike" href="/${escapeHtml(p.slug)}" data-link>Voltar</a>
        <a class="btn" href="/${escapeHtml(p.slug)}/mapa" data-link>Ir para Mapa</a>
        ${pdf ? `<a class="btn primary" href="${escapeHtml(pdf)}" target="_blank" rel="noopener noreferrer">Abrir PDF</a>` : ""}
      </div>
    </section>

    <section class="page" style="margin-top:16px">
      <div class="page-head">
        <h2>Visualização</h2>
        <p>Se o PDF estiver configurado, ele abre em nova aba. Aqui também podemos embutir um viewer depois.</p>
      </div>
    </section>
  `;
}
