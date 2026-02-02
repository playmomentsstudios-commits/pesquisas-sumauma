import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";
import { fetchPesquisaEquipe } from "../fetch-pesquisa-equipe.js";

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
  let equipe = Array.isArray(ft.equipe) ? ft.equipe : [];
  const pesquisaId = p?.dbId || p?._dbId || "";
  let equipeError = null;

  if (pesquisaId) {
    const { data, error } = await fetchPesquisaEquipe(pesquisaId);
    if (error) {
      equipeError = error;
      console.error("[fichaTecnica] erro ao buscar equipe:", error);
    }
    if (Array.isArray(data) && data.length) {
      equipe = data;
    }
  }

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

      ${
        (ft.equipeTexto || "").trim()
          ? `<p class="ft-team-text">${escapeHtml(ft.equipeTexto)}</p>`
          : ``
      }

      <div class="ft-people-grid">
        ${
          equipe.length
            ? equipe.map(person => {
                const foto = person.foto || withBase("/public/assets/img/equipe/placeholder.jpg");
                const nome = person.nome || "";
                const funcao = person.funcao || "";
                const fotoUrl = person.foto_url || "";
                const link = (person.linkedin || person.link || "").trim();
                const finalFoto = fotoUrl || foto;

                const inner = `
                  <img src="${escapeHtml(finalFoto)}" alt="${escapeHtml(nome)}">
                  <h3>${escapeHtml(nome)}</h3>
                  <p>${escapeHtml(funcao)}</p>
                `;

                return link
                  ? `<a class="ft-person-card ft-person-card-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
                  : `<div class="ft-person-card">${inner}</div>`;
              }).join("")
            : `<div style="color:#666;">Nenhum integrante cadastrado.</div>`
        }
      </div>
      ${
        equipe.length === 0 && equipeError
          ? `<p style="color:#a33;font-size:13px;">Erro ao buscar equipe — confira o Console (query/colunas/pesquisa_id).</p>`
          : ""
      }
    </section>
  `;
}

export default renderFichaTecnica;
export { renderFichaTecnica };
