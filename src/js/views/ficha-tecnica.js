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

/** Garante URL válida para abrir em nova aba */
function normalizeExternalUrl(raw){
  const v = String(raw || "").trim();
  if (!v) return "";
  // aceita http/https/mailto/tel
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v;
  // se veio "www..." ou domínio solto, prefixa https
  return `https://${v.replace(/^\/+/, "")}`;
}

function pickPersonLink(person){
  // tenta vários nomes de campo (caso o JSON/DB varie)
  const candidates = [
    person?.link,
    person?.url,
    person?.perfil,
    person?.site,
    person?.website,
    person?.linkedin,
    person?.instagram
  ];
  const found = candidates.find(v => String(v || "").trim());
  return found ? normalizeExternalUrl(found) : "";
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
      ${
        !realizacao.logo && !financiador.logo
          ? `<p style="margin-top:12px; color:#666;">Ficha técnica ainda não disponível.</p>`
          : ""
      }
    </section>

    <section class="ft-section">
      <h2>Equipe da Pesquisa</h2>

      <div class="ft-people-grid">
        ${
          equipe.length
            ? equipe.map(person => {
                const foto = escapeHtml(person.foto || withBase("/public/assets/img/equipe/placeholder.jpg"));
                const nome = escapeHtml(person.nome || "");
                const funcao = escapeHtml(person.funcao || "");
                const link = pickPersonLink(person);

                return `
                  <div class="ft-person-card">
                    <img src="${foto}" alt="${nome}">
                    <h3>${nome}</h3>
                    <p>${funcao}</p>
                    ${
                      link
                        ? `<a class="ft-person-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Conhecer</a>`
                        : ``
                    }
                  </div>
                `;
              }).join("")
            : `<div style="color:#666;">Nenhum integrante cadastrado no JSON.</div>`
        }
      </div>
    </section>
  `;
}

export default renderFichaTecnica;
export { renderFichaTecnica };
