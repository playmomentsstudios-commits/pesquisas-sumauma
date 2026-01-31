import { loadPesquisas, getPesquisaBySlug, wireDropdown, spaLinkHandler, getSpaRedirect, escapeHtml, getSiteConfig } from "./utils.js";
import { getBasePath, stripBase, withBase } from "./basepath.js";
import renderHome from "./views/home.js";
import renderPesquisa from "./views/pesquisa.js";
import renderRelatorio from "./views/relatorio.js";
import renderFichaTecnica from "./views/ficha-tecnica.js";
import renderMapaPesquisa from "./views/mapa-pesquisa.js";
import { getPesquisaConteudoKV, buildPesquisaResumoFromKV } from "../data/pesquisaConteudoKV.js";

const DEBUG_ROUTER = true;
function dlog(...args){
  if (DEBUG_ROUTER) console.log("[ROUTER]", ...args);
}


function setHeaderBanner(url){
  const header = document.querySelector(".header");
  if (!header) return;
  if (url) {
    header.style.setProperty("--header-banner", `url("${url}")`);
  } else {
    header.style.removeProperty("--header-banner");
  }
}

function setHeaderCredit(text){
  const credit = document.getElementById("headerCredit");
  if (!credit) return;
  const value = String(text || "").trim();
  credit.textContent = value;
}

async function hydratePesquisaResumoFromKV(item){
  const client = window?.supabaseClient || null;
  const pesquisaId = item?.dbId || item?._dbId || item?.id;
  if (!client || !pesquisaId) return item;
  try {
    const rows = await getPesquisaConteudoKV(client, pesquisaId);
    if (rows.length) {
      item.pesquisaResumo = buildPesquisaResumoFromKV(rows);
    }
  } catch (err) {
    console.warn("[ROUTER] Falha ao carregar pesquisa_conteudo:", err?.message || err);
  }
  return item;
}

export async function initRouter(){
  const app = document.getElementById("app");
  try {
    const redirect = getSpaRedirect();
    if (redirect && redirect !== location.pathname) {
      history.replaceState({}, "", redirect);
    }

    document.addEventListener("click", (e) => spaLinkHandler(e, navigate));
    window.addEventListener("popstate", () => route());

    function navigate(path){
      history.pushState({}, "", path);
      route();
    }

    function notFound(slug, slugs = []){
      const safeSlug = escapeHtml(slug || "");
      const slugsList = slugs.length ? slugs.map(s => escapeHtml(s)).join(", ") : "nenhum";
      app.innerHTML = `
        <div class="hero">
          <h1 style="margin:0 0 10px;color:#0f3d2e;">Página não encontrada</h1>
          <p style="margin:0;color:#555;line-height:1.7;">Slug não encontrado: <strong>${safeSlug}</strong>.</p>
          <p style="margin:6px 0 0;color:#555;line-height:1.7;">Slugs carregados: ${slugsList}</p>
          <div style="margin-top:14px">
            <a class="btn primary" href="${withBase("/")}" data-link>Voltar</a>
          </div>
        </div>
      `;
    }

    async function route(){
      const raw = location.pathname;
      const base = getBasePath();
      const path = stripBase(raw).replace(/\/+$/,"") || "/";
      dlog("raw=", raw, "base=", base, "clean=", path);

      const pesquisas = await loadPesquisas(false);
      wireDropdown(pesquisas);

      if (path === "/"){
        dlog("view=home");
        const homeBanner = await getSiteConfig("home_banner_url");
        setHeaderBanner(homeBanner || null);
        setHeaderCredit("");
        app.innerHTML = await renderHome();
        return;
      }

      const parts = path.split("/").filter(Boolean);
      dlog("parts=", parts);
      const slug = parts[0];
      let sub = parts[1] || "pesquisa";

      const item = await getPesquisaBySlug(slug);
      if (!item){
        dlog("pesquisa encontrada?", false);
        notFound(slug, pesquisas.map(p => p.slug));
        return;
      }
      dlog("pesquisa encontrada?", true);
      setHeaderBanner(item.bannerUrl || null);
      setHeaderCredit(item.bannerCredito || "");

      const viewNameMap = {
        mapa: "mapa",
        pesquisa: "pesquisa",
        "ficha-tecnica": "ficha-tecnica",
        relatorio: "relatorio"
      };

      const viewName = viewNameMap[sub] || "notFound";
      console.log("[ROUTER] slug=", slug, "sub=", sub, "view=", viewName);

      if (sub === "pesquisa"){
        await hydratePesquisaResumoFromKV(item);
        app.innerHTML = await renderPesquisa(item);
        return;
      }
      if (sub === "mapa"){
        app.innerHTML = await renderMapaPesquisa(item);
        return;
      }
      if (sub === "ficha-tecnica"){
        app.innerHTML = await renderFichaTecnica(item);
        return;
      }
      if (sub === "relatorio"){
        app.innerHTML = await renderRelatorio(item);
        return;
      }

      dlog("view=notFound");
      notFound(slug, pesquisas.map(p => p.slug));
    }

    route();

  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <div class="hero">
        <h1 style="margin:0 0 10px;color:#0f3d2e;">Erro ao carregar o site</h1>
        <p style="margin:0;color:#555;line-height:1.7;">
          Não foi possível carregar os dados das pesquisas.
        </p>
        <p style="margin-top:10px;color:#666;font-size:13px;line-height:1.6;">
          Verifique se existe o arquivo <b>data/pesquisas.json</b> (ou <b>public/data/pesquisas.json</b>) e se o caminho está correto.
        </p>
      </div>
    `;
  }
}
