import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function renderTabs(slug, active) {
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = sub === active;
    return `<a class="tab tab-btn ${isActive ? "tab-active active" : "tab-idle"}" href="${withBase(
      `/${s}/${sub}`
    )}" data-link>${label}</a>`;
  };
  return `
    <div class="subbar">
      <div class="subbar-right page-tabs">
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
  const creditos = escapeHtml(t?.imagem_creditos || "");

  const hasImg = Boolean(img);
  return `
    <article class="topic-block topico-card">
      ${hasImg ? `<div class="topico-media" style="background-image:url('${escapeHtml(img)}')"></div>` : ""}
      <div class="topico-body">
        ${titulo ? `<h4 class="topico-title">${titulo}</h4>` : ""}
        ${desc ? `<p class="topico-text">${desc}</p>` : ""}
      </div>
      ${creditos ? `<span class="topico-creditos">${creditos}</span>` : ""}
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

    <div class="pesquisa-page">
      <section class="page">
        <div class="page-head">
          <div class="kicker">
            <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
          </div>

          <h2 class="pesquisa-title">${escapeHtml(p.titulo || "Pesquisa")}</h2>
          <p class="pesquisa-subtitle">${escapeHtml(descricao || "Conteúdo ainda não cadastrado.")}</p>
        </div>
      </section>

      <section class="page" style="margin-top:16px">
        <div class="page-head">
          <h3>Pesquisa</h3>
        </div>

        ${resumoTexto ? `<p class="pesquisa-resumo">${escapeHtml(resumoTexto)}</p>` : ""}

        <div class="topic-list pesquisa-topicos">
          ${
            topicos.length
              ? topicos.map((t, idx) => topicBlock(t, idx, topicos.length)).join("")
              : `<p>Conteúdo ainda não cadastrado em <b>pesquisaResumo.topicos</b>.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

export default renderPesquisa;
export { renderPesquisa };
