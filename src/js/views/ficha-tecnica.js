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
        ${tab("pesquisa","Pesquisa")}
        ${tab("relatorio","Relatório")}
        ${tab("mapa","Mapa")}
        ${tab("ficha-tecnica","Ficha Técnica")}
      </div>
    </div>
  `;
}

async function renderFichaTecnica(p){
  const ft = p.fichaTecnica || {};
  const realizacao = ft.realizacao || {};
  const financiador = ft.financiador || {};
  const equipe = Array.isArray(ft.equipe) ? ft.equipe : [];

  const realizacaoLogo = realizacao.logo || withBase("/public/assets/logos/sumauma-logo.png");
  const realizacaoNome = realizacao.nome || "Realização";

  const financiadorLogo = financiador.logo || "";
  const financiadorNome = financiador.nome || "Financiador";
  const renderPersonCard = (person = {}) => {
    const name = person?.nome || person?.name || "";
    const role = person?.funcao || person?.papel || person?.role || "";
    const photo = person?.foto_url || person?.foto || person?.photo_url || "";
    const link = person?.link || person?.url || person?.site || person?.instagram || "";

    const safeName = escapeHtml(name);
    const safeRole = escapeHtml(role);
    const safePhoto = escapeHtml(photo);
    const safeLink = escapeHtml(String(link).trim());
    const inner = `
      <div class="ft-person-inner">
        ${
          photo
            ? `<img class="ft-person-photo" src="${safePhoto}" alt="${safeName}">`
            : `<div class="ft-person-photo placeholder"></div>`
        }
        <div class="ft-person-text">
          <h3 class="ft-person-name">${safeName}</h3>
          ${role ? `<p class="ft-person-role">${safeRole}</p>` : ``}
        </div>
      </div>
    `;

    if (safeLink) {
      return `<a class="ft-person-card ft-card--participant" href="${safeLink}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    }

    return `<div class="ft-person-card ft-card--participant">${inner}</div>`;
  };

  return `
    <div class="page-ficha-tecnica">
      ${tabs(p.slug, "ficha-tecnica")}

      <section class="ft-section">
      <div class="ft-logos-grid">
        <div class="ft-logo-box ft-logo--apresenta">
          <h3>${escapeHtml(realizacaoNome)}</h3>
          <img src="${escapeHtml(realizacaoLogo)}" alt="${escapeHtml(realizacaoNome)}">
        </div>

        <div class="ft-logo-box ft-logo--financiador">
          <h3>${escapeHtml(financiadorNome)}</h3>
          ${
            financiadorLogo
              ? `<img src="${escapeHtml(financiadorLogo)}" alt="${escapeHtml(financiadorNome)}">`
              : `<div style="color:#666;font-size:13px;">(logo não definido no JSON)</div>`
          }
        </div>
      </div>
      ${
        !realizacao.logo && !financiador.logo
          ? `<p style="margin-top:12px; color:#666;">Ficha técnica ainda não disponível.</p>`
          : ""
      }
    </section>

      <section class="ft-section">
      <h2>Equipe da Pesquisa</h2>

      ${
        (ft.equipeTexto || "").trim()
          ? `<p class="ft-team-text">${escapeHtml(ft.equipeTexto)}</p>`
          : ``
      }

      <div class="ft-people-grid">
        ${
          equipe.length
            ? equipe.map(renderPersonCard).join("")
            : `<div style="color:#666;">Nenhum integrante cadastrado.</div>`
        }
      </div>
      </section>
    </div>
  `;
}

export default renderFichaTecnica;
export { renderFichaTecnica };
