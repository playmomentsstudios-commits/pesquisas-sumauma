import "./map.js";
import { initRouter } from "./router.js";
import { setYear, loadPesquisas, getSiteConfig } from "./utils.js";
import { withBase } from "./basepath.js";

async function initFavicon(){
  try {
    const faviconUrl = await getSiteConfig("favicon_url");
    if (!faviconUrl) return;
    const link = document.getElementById("siteFavicon");
    if (link) link.setAttribute("href", faviconUrl);
  } catch (e) {
    console.warn("[FAVICON] falhou:", e?.message || e);
  }
}


function initHeaderSearch(){
  const input = document.getElementById("pesquisasSearch");
  const panel = document.getElementById("pesquisasSearchPanel");
  if (!input || !panel) return;

  let cache = [];

  function close(){
    panel.classList.remove("open");
    panel.innerHTML = "";
  }

  function open(items){
    panel.innerHTML = items.map((p) => `
      <a class="search-item" href="${withBase("/" + p.slug + "/mapa")}" data-link role="option">
        <strong>${p.titulo}</strong>
        <small>Ano base: ${p.anoBase || ""}</small>
      </a>
    `).join("");
    panel.classList.add("open");
  }

  async function ensure(){
    if (!cache.length) cache = await loadPesquisas(false);
  }

  input.addEventListener("input", async () => {
    const q = String(input.value || "").trim().toLowerCase();
    await ensure();
    if (!q) return close();

    const items = cache
      .filter(p => (`${p.titulo} ${p.slug} ${p.anoBase}`.toLowerCase().includes(q)))
      .slice(0, 8);

    if (!items.length) return close();
    open(items);
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== input) close();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter") {
      const first = panel.querySelector("a[data-link]");
      if (first) first.click();
    }
  });
}

function applySiteAppearance(config){
  const styleId = "siteAppearanceVars";
  const old = document.getElementById(styleId);
  if (old) old.remove();

  const ap = config?.appearance_json || {};
  const colors = ap.colors || {};
  const tabs = ap.tabs || {};
  const header = ap.header || {};

  const css = `
:root{
  --green:${colors.green || "#0f3d2e"};
  --brown:${colors.brown || "#5a2a12"};
  --gold:${colors.gold || "#ffdd9a"};
  --bg:${colors.bg || "#f4f4f4"};
  --text:${colors.text || "#222"};
  --muted:${colors.muted || "#555"};
  --line:${colors.line || "#e5e5e5"};

  --tab-radius:${(tabs.radius ?? 12)}px;
  --tab-font-size:${(tabs.fontSize ?? 13)}px;
  --tab-pad-y:${(tabs.padY ?? 8)}px;
  --tab-pad-x:${(tabs.padX ?? 8)}px;
  --tab-gap:${(tabs.gap ?? 8)}px;

  --header-mobile-height:${(header.mobileHeight ?? 200)}px;
  --header-search-bottom:${(header.searchBottom ?? 12)}px;
  --header-overlay-pad-x:${(header.overlayPadX ?? 20)}px;
  --header-overlay-pad-bottom:${(header.overlayPadBottom ?? 64)}px;
}
${config?.custom_css || ""}`.trim();

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
}

async function initSiteAppearance(){
  try {
    const client = await window.getSupabaseClient?.();
    if (!client) return;

    const { data, error } = await client
      .from("site_config")
      .select("appearance_json, custom_css")
      .eq("config_key", "main")
      .maybeSingle();

    if (error) {
      console.warn("[APPEARANCE] falhou:", error.message || error);
      return;
    }

    if (data) applySiteAppearance(data);
  } catch (e) {
    console.warn("[APPEARANCE] falhou:", e?.message || e);
  }
}


setYear();
(async () => {
  try {
    const logoUrl = await getSiteConfig("site_logo_url");
    const img = document.getElementById("siteLogoImg");
    if (img && logoUrl) img.src = logoUrl;
  } catch (e) {
    console.warn("[LOGO] falhou:", e?.message || e);
  }
})();
const headerLogo = document.querySelector(".header-logo");
if (headerLogo) headerLogo.setAttribute("href", withBase("/"));
initHeaderSearch();
initRouter();
initFavicon();
initSiteAppearance();
