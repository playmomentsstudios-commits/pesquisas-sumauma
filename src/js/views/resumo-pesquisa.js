import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function tabs(slug, active){
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = active === sub;
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

export function renderResumoPesquisa(p){
  const resumo = p.pesquisaResumo || {};
  const intro = resumo.introducao || {};
  const quote = resumo.citacao || {};
  const topicos = Array.isArray(resumo.topicos) ? resumo.topicos : [];

  return `
    ${tabs(p.slug, "pesquisa")}

    <section class="suma-section">
      <h1>${escapeHtml(intro.titulo || "A Pesquisa")}</h1>
      <p>${escapeHtml(intro.texto || "Conteúdo da introdução ainda não definido no pesquisas.json.")}</p>
    </section>

    ${
      quote.texto
        ? `
          <section class="suma-quote">
            <blockquote>
              “${escapeHtml(quote.texto)}”
              ${quote.autor ? `<footer>${escapeHtml(quote.autor)}</footer>` : ""}
            </blockquote>
          </section>
        `
        : ""
    }

    ${
      topicos.length
        ? topicos.map(t => `
            ${t.imagem ? fullImg(t.imagem) : ""}
            <section class="suma-section">
              <h2>${escapeHtml(t.titulo || "")}</h2>
              <p>${escapeHtml(t.texto || "")}</p>
            </section>
          `).join("")
        : `
          <section class="suma-section">
            <h2>Conteúdo do resumo</h2>
            <p>Nenhum tópico cadastrado em <b>pesquisaResumo.topicos</b> no pesquisas.json.</p>
          </section>
        `
    }
  `;
}

function fullImg(src){
  const s = escapeHtml(src);
  return `<div class="suma-full-image" style="background-image:url('${s}')"></div>`;
}
