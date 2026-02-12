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

/**
 * Força download do PDF (sem abrir visualizador)
 * Funciona mesmo quando o arquivo está em Supabase/CDN (outra origem).
 */
async function forceDownload(url, filename = "relatorio.pdf"){
  try{
    const res = await fetch(url, { mode: "cors" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectUrl);
  }catch(err){
    // fallback: se falhar, abre em nova aba (pelo menos não quebra)
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

async function renderRelatorio(p){
  const pdf = p.relatorioPdf || "";
  const leitura = p.leituraUrl || "";

  const safeSlug = String(p.slug || "pesquisa").replace(/[^\w-]+/g, "-");
  const safeAno = String(p.anoBase || "").replace(/[^\d]+/g, "");
  const filename = `relatorio-${safeSlug}${safeAno ? `-${safeAno}` : ""}.pdf`;

  return `
    ${tabs(p.slug)}

    <section class="page">
      <div class="page-head">
        <h2>Relatório</h2>
        <p><strong>${escapeHtml(p.titulo || "")}</strong> — Ano base: ${escapeHtml(p.anoBase || "")}</p>
        <p>${escapeHtml(p.sinopse || "Relatório ainda não disponível.")}</p>

        <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap">
          ${
            pdf
              ? `<button class="btn primary" type="button" data-download-pdf data-pdf="${escapeHtml(pdf)}" data-fn="${escapeHtml(filename)}">
                   Download PDF
                 </button>`
              : ""
          }

          ${
            leitura
              ? `<a class="btn"
                   href="${escapeHtml(leitura)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   Abrir leitura
                 </a>`
              : ""
          }
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

/**
 * Chame isso depois de inserir o HTML do relatório no DOM.
 * Ex: app.innerHTML = await renderRelatorio(p); bindRelatorioDownload();
 */
function bindRelatorioDownload(){
  const btn = document.querySelector("[data-download-pdf]");
  if(!btn) return;

  btn.addEventListener("click", () => {
    const url = btn.getAttribute("data-pdf") || "";
    const filename = btn.getAttribute("data-fn") || "relatorio.pdf";
    if(!url) return;
    forceDownload(url, filename);
  });
}

export default renderRelatorio;
export { renderRelatorio, bindRelatorioDownload };
