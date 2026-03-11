import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function tabs(slug) {
  const s = escapeHtml(slug);

  function tab(sub, label) {
    const active = sub === "relatorio" ? "tab-active" : "tab-idle";
    const url = withBase("/" + s + "/" + sub);
    return '<a class="tab ' + active + '" href="' + url + '" data-link>' + label + '</a>';
  }

  return (
    '<div class="subbar">' +
      '<div class="subbar-right">' +
        tab("pesquisa","Pesquisa") +
        tab("relatorio","Relatório") +
        tab("mapa","Mapa") +
        tab("ficha-tecnica","Ficha Técnica") +
      '</div>' +
    '</div>'
  );
}

async function renderRelatorio(p) {

  const pdf = p.relatorioPdf || "";
  const leitura = p.leituraUrl || "";

  const safeSlug = String(p.slug || "pesquisa").replace(/[^\w-]+/g,"-");
  const safeAno = String(p.anoBase || "").replace(/[^\d]+/g,"");

  const filename = "relatorio-" + safeSlug + (safeAno ? "-" + safeAno : "") + ".pdf";

  let downloadUrl = "";
  if (pdf) {
    downloadUrl = pdf + (pdf.indexOf("?") > -1 ? "&download=1" : "?download=1");
  }

  let html = "";

  html += tabs(p.slug);

  html += '<section class="page">';
  html += '<div class="page-head">';

  html += '<h2>Relatório</h2>';

  html += '<p><strong>' + escapeHtml(p.titulo || "") + '</strong> — Ano base: ' + escapeHtml(p.anoBase || "") + '</p>';

  html += '<p>' + escapeHtml(p.sinopse || "Relatório ainda não disponível.") + '</p>';

  html += '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">';

  if (pdf) {
    html += '<a class="btn primary" href="' + escapeHtml(downloadUrl) + '" download="' + escapeHtml(filename) + '">Baixar PDF</a>';
  }

  if (leitura) {
    html += '<a class="btn" href="' + escapeHtml(leitura) + '" target="_blank" rel="noopener noreferrer">Abrir leitura</a>';
  }

  html += '</div>';

  if (pdf) {
    html += '<div style="margin-top:16px;border-radius:16px;overflow:hidden;border:1px solid #e6e6e6;">';
    html += '<iframe src="' + escapeHtml(pdf) + '" style="width:100%;height:80vh;border:0;"></iframe>';
    html += '</div>';
  } else {
    html += '<p style="margin-top:12px;color:#666;">Relatório ainda não disponível.</p>';
  }

  html += '</div>';
  html += '</section>';

  return html;
}

export default renderRelatorio;
export { renderRelatorio };
