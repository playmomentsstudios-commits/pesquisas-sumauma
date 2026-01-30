import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function renderTabs(slug, active) {
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = sub === active;
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="${withBase(
      `/${s}/${sub}`
    )}" data-link>${label}</a>`;
  };
  return `
    <div class="subbar">
      <div class="subbar-right">
        ${tab("pesquisa", "Pesquisa")}
        ${tab("relatorio", "Relatório")}
        ${tab("mapa", "Mapa")}
        ${tab("ficha-tecnica", "Ficha Técnica")}
      </div>
    </div>
  `;
}

function topicBlock(t, idx, total) {
  const titulo = escapeHtml(t?.titulo || t?.text || t?.texto || "");
  const desc = escapeHtml(t?.descricao || t?.resumo || t?.texto || "");
  const img = t?.imagem ? String(t.imagem) : "";

  const hasImg = Boolean(img);
  const showDividerImg = hasImg;

  return `
    <article class="topic-block">
      ${titulo ? `<h4 class="topic-title">${titulo}</h4>` : ""}
      ${desc ? `<p class="topic-desc">${desc}</p>` : ""}

      ${
        showDividerImg
          ? `
            <div class="topic-image-wrap">
              <img class="topic-image" src="${escapeHtml(img)}" alt="${
                titulo ? "Imagem do tópico: " + titulo : "Imagem do tópico"
              }"
                loading="lazy"
                onerror="this.style.display='none'; this.closest('.topic-image-wrap') && (this.closest('.topic-image-wrap').style.display='none');"
              />
            </div>
          `
          : ""
      }

      ${idx < total - 1 ? `<div class="topic-sep" aria-hidden="true"></div>` : ""}
    </article>
  `;
}

async function renderPesquisa(p) {
  const resumo = p?.pesquisaResumo || {};
  const topicos = Array.isArray(resumo.topicos) ? resumo.topicos : [];
  const resumoTexto = resumo.resumo || "";
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
        <h3>Pesquisa</h3>
      </div>

      ${resumoTexto ? `<p class="pesquisa-resumo">${escapeHtml(resumoTexto)}</p>` : ""}

      <div class="topic-list">
        ${
          topicos.length
            ? topicos.map((t, idx) => topicBlock(t, idx, topicos.length)).join("")
            : `<p>Conteúdo ainda não cadastrado em <b>pesquisaResumo.topicos</b>.</p>`
        }
      </div>
    </section>
  `;
}

export default renderPesquisa;
export { renderPesquisa };
