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

function renderQuote(citacao) {
  if (!citacao || (!citacao.texto && !citacao.autor)) return "";
  const texto = escapeHtml(citacao.texto || "");
  const autor = escapeHtml(citacao.autor || "");

  return `
    <section class="research-quote">
      <div class="research-quote-inner">
        <blockquote>
          “${texto}”
          ${autor ? `<footer>${autor}</footer>` : ""}
        </blockquote>
      </div>
    </section>
  `;
}

function renderTopicsList(topicos) {
  if (!Array.isArray(topicos) || topicos.length === 0) {
    return `
      <div class="research-card">
        <h3>Tópicos da pesquisa</h3>
        <p class="muted">Conteúdo ainda não cadastrado em <b>pesquisaResumo.topicos</b>.</p>
      </div>
    `;
  }

  return `
    <div class="research-card">
      <h3>Tópicos da pesquisa</h3>
      <ul class="research-topics">
        ${topicos
          .map((t) => `<li>${escapeHtml(t.titulo || t.texto || "")}</li>`)
          .join("")}
      </ul>
    </div>
  `;
}

function renderEditorialSections(topicos) {
  if (!Array.isArray(topicos) || topicos.length === 0) return "";

  // Render “editorial”: título + texto, seguindo vibe do pesquisa.html
  return topicos
    .map((t, idx) => {
      const titulo = escapeHtml(t.titulo || `Tópico ${idx + 1}`);
      const texto = escapeHtml(t.texto || "");
      if (!texto) return ""; // se não tiver descrição, não cria seção grande

      return `
        <section class="research-section">
          <div class="research-section-inner">
            <h2>${titulo}</h2>
            <p>${texto}</p>
          </div>
        </section>
      `;
    })
    .join("");
}

async function renderPesquisa(p) {
  const resumo = p?.pesquisaResumo || {};
  const topicos = Array.isArray(resumo.topicos) ? resumo.topicos : [];
  const descricao = p.descricaoCurta || p.sinopse || "";

  return `
    ${renderTabs(p.slug, "pesquisa")}

    <section class="research-hero">
      <div class="research-hero-inner">
        <div class="research-meta">
          <span class="research-meta-label">Ano base:</span>
          <span class="research-meta-value">${escapeHtml(p.anoBase || "")}</span>
        </div>

        <h1 class="research-title">${escapeHtml(p.titulo || "Pesquisa")}</h1>

        <p class="research-lead">
          ${escapeHtml(descricao || "Conteúdo ainda não cadastrado.")}
        </p>

        ${renderTopicsList(topicos)}
      </div>
    </section>

    ${renderQuote(resumo.citacao)}

    ${renderEditorialSections(topicos)}
  `;
}

export default renderPesquisa;
export { renderPesquisa };
