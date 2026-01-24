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

export function renderFichaTecnica(p){
  const ft = p.fichaTecnica || {};
  const realizacao = ft.realizacao || {};
  const financiador = ft.financiador || {};
  const equipe = Array.isArray(ft.equipe) ? ft.equipe : [];

  const realizacaoLogo = realizacao.logo || withBase("/public/assets/logos/sumauma-logo.png");
  const realizacaoNome = realizacao.nome || "Realização";

  const financiadorLogo = financiador.logo || "";
  const financiadorNome = financiador.nome || "Financiador";

  return `
    ${tabs(p.slug, "ficha-tecnica")}

    <section class="ft-section">
      <div class="ft-logos-grid">
        <div class="ft-logo-box">
          <h3>${escapeHtml(realizacaoNome)}</h3>
          <img src="${escapeHtml(realizacaoLogo)}" alt="${escapeHtml(realizacaoNome)}">
        </div>

        <div class="ft-logo-box">
          <h3>${escapeHtml(financiadorNome)}</h3>
          ${
            financiadorLogo
              ? `<img src="${escapeHtml(financiadorLogo)}" alt="${escapeHtml(financiadorNome)}">`
              : `<div style="color:#666;font-size:13px;">(logo não definido no JSON)</div>`
          }
        </div>
      </div>
    </section>

    <section class="ft-section">
      <h2>Equipe da Pesquisa</h2>

      <div class="ft-people-grid">
        ${
          equipe.length
            ? equipe.map(person => `
              <div class="ft-person-card">
                <img src="${escapeHtml(person.foto || withBase("/public/assets/img/equipe/placeholder.jpg"))}" alt="${escapeHtml(person.nome || "")}">
                <h3>${escapeHtml(person.nome || "")}</h3>
                <p>${escapeHtml(person.funcao || "")}</p>
              </div>
            `).join("")
            : `<div style="color:#666;">Nenhum integrante cadastrado no JSON.</div>`
        }
      </div>
    </section>
  `;
}
