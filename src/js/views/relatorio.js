import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function tabs(slug){
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = sub === "relatorio";
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="${withBase(`/${s}/${sub}`)}" data-link>${label}</a>`;
  };
  return `
    <div class="subbar">
      <div class="subbar-right">
        ${tab("pesquisa","Pesquisa")}
        ${tab("relatorio","Relatório")}
        ${tab("mapa","Mapa")}
        ${tab("ficha-tecnica","Ficha Técnica")}
      </div>
    </div>
  `;
}

async function renderRelatorio(p){
  const pdf = p.relatorioPdf || "";
  const leitura = p.leituraUrl || "";
  return `
    ${tabs(p.slug)}

    <section class="page">
      <div class="page-head">
        <h2>Relatório</h2>
        <p><strong>${escapeHtml(p.titulo || "")}</strong> — Ano base: ${escapeHtml(p.anoBase || "")}</p>
        <p>${escapeHtml(p.sinopse || "Relatório ainda não disponível.")}</p>

        <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap">
          ${pdf ? `<a class="btn primary" href="${escapeHtml(pdf)}" target="_blank" rel="noopener noreferrer">Download PDF</a>` : ""}
          ${leitura ? `<a class="btn" href="${escapeHtml(leitura)}" target="_blank" rel="noopener noreferrer">Abrir leitura</a>` : ""}
        </div>

        ${
          pdf
            ? `
              <div style="margin-top:16px;border-radius:16px;overflow:hidden;border:1px solid #e6e6e6;">
                <iframe src="${escapeHtml(pdf)}" title="Relatório PDF" style="width:100%;height:80vh;border:0;"></iframe>
              </div>
            `
            : leitura
            ? ""
            : `<p style="margin-top:12px; color:#666;">Relatório ainda não disponível.</p>`
        }
      </div>
    </section>
  `;
}

export default renderRelatorio;
export { renderRelatorio };
