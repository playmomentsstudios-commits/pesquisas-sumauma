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

export function renderResumoPesquisa(p){
  const slug = p.slug || "";
  const titulo = p.titulo || "Pesquisa";

  // Imagens horizontais (coloque esses arquivos em: public/assets/img/pesquisa/)
  const imgs = Array.from({ length: 10 }).map((_,i)=>`./public/assets/img/pesquisa/img-${i+1}.jpg`);

  return `
    ${tabs(slug, "pesquisa")}

    <section class="suma-section">
      <h1>${escapeHtml("A Pesquisa")}</h1>
      <p>
        Esta pesquisa investiga práticas comunicacionais e culturais quilombolas
        nos meios digitais, compreendendo a comunicação como ato político,
        ancestral e estratégico na luta por justiça climática, racial e territorial.
      </p>
    </section>

    <section class="suma-quote">
      <blockquote>
        “O quilombo representa um instrumento vigoroso no processo de
        reconhecimento da identidade negra brasileira para uma maior
        autoafirmação étnica e nacional…”
        <footer>Maria Beatriz Nascimento — Historiadora, professora e ativista afro-brasileira</footer>
      </blockquote>
    </section>

    ${fullImg(imgs[0])}

    ${topic("Mapeando práticas culturais e comunicacionais nos meios digitais",
      "O mapeamento identifica como coletivos quilombolas utilizam ferramentas digitais para fortalecer suas narrativas.")}

    ${fullImg(imgs[1])}

    ${topic("A cultura e a comunicação como ato político e ancestral",
      "A comunicação é compreendida como extensão da ancestralidade, da oralidade e da memória coletiva.")}

    ${fullImg(imgs[2])}

    ${topic("Perfil sociodemográfico",
      "A pesquisa apresenta o perfil dos sujeitos e coletivos envolvidos, evidenciando território e formas de organização.")}

    ${fullImg(imgs[3])}

    ${topic("Trajetórias pessoais em práticas comunicacionais e culturais",
      "São analisadas as trajetórias individuais que constroem práticas alinhadas à identidade quilombola.")}

    ${fullImg(imgs[4])}

    ${topic("Trajetórias comunitárias em práticas comunicacionais e culturais",
      "A comunicação comunitária aparece como eixo estruturante na organização política e territorial.")}

    ${fullImg(imgs[5])}

    ${topic("Aspectos organizacionais e redes colaborativas",
      "Redes colaborativas ampliam o alcance das práticas, fortalecendo alianças e incidência política.")}

    ${fullImg(imgs[6])}

    ${topic("Quilombo enquanto sinônimo de futuro",
      "O quilombo é apresentado como projeto político de futuro, articulando comunicação e território.")}

    ${fullImg(imgs[7])}

    ${topic("Considerações finais",
      "A pesquisa reafirma a centralidade da comunicação quilombola na transformação social.")}

    ${fullImg(imgs[8])}

    ${topic("Sugestões e recomendações",
      "São apresentadas recomendações para políticas públicas e fortalecimento institucional.")}

    ${fullImg(imgs[9])}

    ${topic("Referências bibliográficas",
      "O estudo dialoga com autores negros e referências fundamentais da comunicação comunitária.")}
  `;
}

function topic(title, text){
  return `
    <section class="suma-section">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
    </section>
  `;
}

function fullImg(src){
  return `<div class="suma-full-image" style="background-image:url('${src}')"></div>`;
}
