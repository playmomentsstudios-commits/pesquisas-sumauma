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

function withDownloadParam(url){
  if (!url) return "";
  // Supabase geralmente suporta ?download=1
  const hasQ = url.includes("?");
  return url + (hasQ ? "&" : "?") + "download=1";
}

async function forceDownload(url, filename = "relatorio.pdf"){
  // Tenta forçar download via blob (não abre visualizador)
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

async function renderRelatorio(p){
  const pdf = p.relatorioPdf || "";
  const leitura = p.leituraUrl || "";

  const safeSlug = String(p.slug || "pesquisa").replace(/[^\w-]+/g, "-");
  const safeAno = String(p.anoBase || "").replace(/[^\d]+/g, "");
  const filename = `relatorio-${safeSlug}${safeAno ? `-${safeAno}` : ""}.pdf`;

  // link direto (fallback) em nova aba
  const direct = pdf ? withDownloadParam(pdf) : "";

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
              ? `
                <a class="btn primary"
                   href="${escapeHtml(direct)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   data-download-pdf
                   data-pdf="${escapeHtml(pdf)}"
                   data-fn="${escapeHtml(filename)}">
                  Download PDF
                </a>
              `
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
  `.trim();
}

/**
 * ✅ Clique sempre responde:
 * - Abre uma aba "about:blank" NO CLIQUE (não é bloqueado).
 * - Tenta baixar via blob.
 * - Se falhar (CORS etc.), usa o link direto (download=1) nessa aba.
 */
function bindRelatorioDownload(){
  const link = document.querySelector("[data-download-pdf]");
  if (!link) return;

  link.addEventListener("click", async (e) => {
    const url = link.getAttribute("data-pdf") || "";
    const filename = link.getAttribute("data-fn") || "relatorio.pdf";
    const href = link.getAttribute("href") || url;

    if (!url) return;

    // abre ABA imediatamente (popup blocker não bloqueia)
    const w = window.open("about:blank", "_blank", "noopener,noreferrer");

    try{
      // tenta baixar sem abrir visualizador
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      // fecha a aba em branco se abriu
      if (w && !w.closed) w.close();

      e.preventDefault();
    }catch(err){
      // se falhar (CORS etc.), manda pro link direto na aba já aberta
      if (w && !w.closed) {
        w.location.href = href;
      } else {
        window.open(href, "_blank", "noopener,noreferrer");
      }
      e.preventDefault();
    }
  });
}

export default renderRelatorio;
export { renderRelatorio, bindRelatorioDownload };
