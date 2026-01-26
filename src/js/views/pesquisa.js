import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function renderTabs(slug, active){
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = sub === active;
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="${withBase(`/${s}/${sub}`)}" data-link>${label}</a>`;
  };
  return `
    <div class="subbar">
      <div class="subbar-right">
        ${tab("mapa","Mapa")}
        ${tab("pesquisa","Pesquisa")}
        ${tab("relatorio","Relatório")}
        ${tab("ficha-tecnica","Ficha Técnica")}
      </div>
    </div>
  `;
}

function renderParagraphs(text){
  const raw = String(text || "").trim();
  if (!raw) return "";
  const parts = raw.split(/\n{2,}/g);
  return parts.map(p => `<p class="ed-p">${escapeHtml(p.trim())}</p>`).join("");
}

function renderFullBleedImage(src, alt, legenda){
  const s = String(src || "").trim();
  if (!s) return "";
  return `
    <div class="ed-fullbleed">
      <div class="ed-fullbleed-inner" style="background-image:url('${escapeHtml(s)}')" role="img" aria-label="${escapeHtml(alt || "")}"></div>
      ${legenda ? `<div class="ed-caption">${escapeHtml(legenda)}</div>` : ""}
    </div>
  `;
}

function renderEditorialBlock(b){
  const type = String(b?.type || "").toLowerCase();

  if (type === "texto"){
    return `
      <section class="ed-section">
        <div class="ed-container">
          ${renderParagraphs(b?.texto)}
        </div>
      </section>
    `;
  }

  if (type === "citacao"){
    const texto = String(b?.texto || "").trim();
    if (!texto) return "";
    return `
      <section class="ed-quote">
        <div class="ed-container">
          <blockquote>
            “${escapeHtml(texto)}”
            ${b?.autor ? `<footer>${escapeHtml(b.autor)}</footer>` : ""}
          </blockquote>
        </div>
      </section>
    `;
  }

  if (type === "imagem"){
    return renderFullBleedImage(b?.src, b?.alt, b?.legenda);
  }

  if (type === "topico"){
    const titulo = String(b?.titulo || "").trim();
    const resumo = String(b?.resumo || "").trim();
    const img = String(b?.imagem || "").trim();
    return `
      ${img ? renderFullBleedImage(img, titulo, "") : ""}
      <section class="ed-section">
        <div class="ed-container">
          ${titulo ? `<h2 class="ed-h2">${escapeHtml(titulo)}</h2>` : ""}
          ${resumo ? `<p class="ed-p">${escapeHtml(resumo)}</p>` : ""}
        </div>
      </section>
    `;
  }

  if (type === "separador"){
    const label = String(b?.label || "").trim();
    return `
      <section class="ed-sep">
        <div class="ed-container">
          ${label ? `<span>${escapeHtml(label)}</span>` : ""}
        </div>
      </section>
    `;
  }

  return "";
}

function renderPesquisaFallback(p){
  const resumo = p?.pesquisaResumo || {};
  const topicos = Array.isArray(resumo.topicos) ? resumo.topicos : [];
  const descricao = p.descricaoCurta || p.sinopse || "";
  return `
    ${renderTabs(p.slug, "pesquisa")}

    <section class="page">
      <div class="page-head">
        <div class="kicker">
          <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
        </div>

        <h2>${escapeHtml(p.titulo || "Pesquisa")}</h2>
        <p>${escapeHtml(descricao || "Conteúdo ainda não cadastrado.")}</p>

      </div>
    </section>

    <section class="page" style="margin-top:16px">
      <div class="page-head">
        <h3>Tópicos da pesquisa</h3>
        ${
          topicos.length
            ? `<ul>${topicos.map(t => `<li>${escapeHtml(t.titulo || t.texto || "")}</li>`).join("")}</ul>`
            : `<p>Conteúdo ainda não cadastrado em <b>pesquisaResumo.topicos</b>.</p>`
        }
      </div>
    </section>
  `;
}

function renderPesquisaEditorial(p, blocos){
  const descricao = p.descricaoCurta || p.sinopse || "";

  const heroBanner = String(p?.capa || "").trim();
  const heroImage = heroBanner
    ? `<div class="ed-hero-media" style="background-image:url('${escapeHtml(heroBanner)}')"></div>`
    : "";

  return `
    ${renderTabs(p.slug, "pesquisa")}

    <section class="ed-hero">
      ${heroImage}
      <div class="ed-hero-overlay">
        <div class="ed-container">
          <div class="ed-kicker">
            <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
          </div>
          <h1 class="ed-h1">${escapeHtml(p.titulo || "Pesquisa")}</h1>
          ${descricao ? `<div class="ed-lead">${renderParagraphs(descricao)}</div>` : ""}
        </div>
      </div>
    </section>

    ${blocos.map(renderEditorialBlock).join("")}
  `;
}

async function renderPesquisa(p){
  const blocos = Array.isArray(p?.pesquisaConteudo?.blocos) ? p.pesquisaConteudo.blocos : [];
  if (blocos.length) return renderPesquisaEditorial(p, blocos);
  return renderPesquisaFallback(p);
}

export default renderPesquisa;
export { renderPesquisa };
