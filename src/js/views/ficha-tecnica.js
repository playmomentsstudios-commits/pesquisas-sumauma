import { escapeHtml } from "../utils.js";

function tabs(slug, active){
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = active === sub;
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="/${s}/${sub}" data-link>${label}</a>`;
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
  const realizacaoLogo = "./public/assets/logos/sumauma-logo.png"; // ajuste se quiser outra logo de realização
  const financiadorLogo = "./public/assets/img/financiador.png";  // coloque esse arquivo (ou altere o nome)

  // Equipe (por enquanto hardcoded igual seu modelo aprovado; depois vem do Admin)
  const equipe = [
    { nome:"Taís Oliveira", funcao:"Coordenação Geral", foto:"./public/assets/img/equipe/tais-oliveira.jpg" },
    { nome:"Juliane Sousa", funcao:"Consultora Convidada", foto:"./public/assets/img/equipe/juliane-sousa.jpg" },
    { nome:"Vanessa Silva", funcao:"Analista de Pesquisa", foto:"./public/assets/img/equipe/vanessa-silva.jpg" },
    { nome:"Anicely Santos", funcao:"Analista de Dados", foto:"./public/assets/img/equipe/anicely-santos.jpg" },
    { nome:"Maria Fernanda Ruas", funcao:"Analista de Comunicação", foto:"./public/assets/img/equipe/maria-fernanda-ruas.jpg" },
    { nome:"Abraão Felipe Oliveira", funcao:"Assistente de Comunicação", foto:"./public/assets/img/equipe/abraao-felipe-oliveira.jpg" },
    { nome:"Diego Galofero", funcao:"Assistente Administrativo", foto:"./public/assets/img/equipe/diego-galofero.jpg" },
    { nome:"Hígor Torres", funcao:"Revisão", foto:"./public/assets/img/equipe/higor-torres.jpg" },
    { nome:"Felipe da Costa Souza", funcao:"Design e Diagramação", foto:"./public/assets/img/equipe/felipe-da-costa-souza.jpg" }
  ];

  return `
    ${tabs(p.slug, "ficha-tecnica")}

    <section class="ft-section">
      <div class="ft-logos-grid">
        <div class="ft-logo-box">
          <h3>Realização</h3>
          <img src="${realizacaoLogo}" alt="Instituto Sumaúma">
        </div>

        <div class="ft-logo-box">
          <h3>Financiador</h3>
          <img src="${financiadorLogo}" alt="Financiador">
        </div>
      </div>
    </section>

    <section class="ft-section">
      <h2>Equipe da Pesquisa</h2>

      <div class="ft-people-grid">
        ${equipe.map(p => `
          <div class="ft-person-card">
            <img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nome)}">
            <h3>${escapeHtml(p.nome)}</h3>
            <p>${escapeHtml(p.funcao)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}
