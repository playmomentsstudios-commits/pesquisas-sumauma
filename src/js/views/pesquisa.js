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

async function renderPesquisa(p){
  const resumo = p?.pesquisaResumo || {};
  const topicos = Array.isArray(resumo.topicos) ? resumo.topicos : [];
  const descricao = p.descricaoCurta || p.sinopse || "";
  return `
    ${renderTabs(p.slug, "pesquisa")}

    <section class="page">
      <div class="page-head">
        <div class="kicker">
          <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
          <span class="badge">Resumo</span>
        </div>

        <h2>${escapeHtml(p.titulo || "Pesquisa")}</h2>
        <p>${escapeHtml(descricao || "Conteúdo ainda não cadastrado.")}</p>

        <div class="card-actions" style="margin-top:10px">
          <a class="btn" href="${withBase(`/${escapeHtml(p.slug)}/mapa`)}" data-link>Mapa</a>
          <a class="btn" href="${withBase(`/${escapeHtml(p.slug)}/relatorio`)}" data-link>Relatório</a>
          <a class="btn" href="${withBase(`/${escapeHtml(p.slug)}/ficha-tecnica`)}" data-link>Ficha técnica</a>
        </div>
      </div>
    </section>

    <section class="page" style="margin-top:16px">
      <div class="page-head">
        <h3>Resumo da pesquisa</h3>
        ${
          topicos.length
            ? `<ul>${topicos.map(t => `<li>${escapeHtml(t.titulo || t.texto || "")}</li>`).join("")}</ul>`
            : `<p>Conteúdo ainda não cadastrado em <b>pesquisaResumo.topicos</b>.</p>`
        }
      </div>
    </section>
  `;
}

export default renderPesquisa;
export { renderPesquisa };
