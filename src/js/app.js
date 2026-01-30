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

function applyFichaTecnicaAppearance(siteConfigRow){
  const ap = siteConfigRow?.appearance_json?.pesquisa?.ficha_tecnica;
  if (!ap) return;

  const s = ap.section || {};
  const t = ap.titles || {};
  const l = ap.logos || {};
  const tt = ap.teamText || {};
  const c = ap.cards || {};
  const b = ap.linkBtn || {};
  const m = ap.mobile || {};

  const css = `
.page-ficha-tecnica{
  --ft-section-bg: ${s.bg || "#fff"};
  --ft-section-radius: ${(s.radius ?? 10)}px;
  --ft-section-shadow: ${s.shadow || "0 4px 15px rgba(0,0,0,0.05)"};
  --ft-section-maxw: ${(s.maxWidth ?? 1100)}px;
  --ft-section-pad-y: ${(s.padY ?? 44)}px;
  --ft-section-pad-x: ${(s.padX ?? 22)}px;
  --ft-section-gap: ${(s.gap ?? 18)}px;

  --ft-h2-color: ${t.h2Color || "var(--green)"};
  --ft-h2-size: ${(t.h2Size ?? 20)}px;
  --ft-h2-weight: ${(t.h2Weight ?? 800)};
  --ft-h2-border: ${t.h2BorderColor || "#eee"};
  --ft-logo-h3-color: ${t.logoH3Color || "var(--green)"};
  --ft-logo-h3-size: ${(t.logoH3Size ?? 14)}px;
  --ft-logo-h3-weight: ${(t.logoH3Weight ?? 800)};

  --ft-logos-gap: ${(l.gridGap ?? 40)}px;
  --ft-logo-box-pad: ${(l.boxPad ?? 18)}px;
  --ft-logo-img-maxw: ${(l.imgMaxWidth ?? 240)}px;

  --ft-team-color: ${tt.color || "#2f2f2f"};
  --ft-team-font: ${(tt.fontSize ?? 14)}px;
  --ft-team-lh: ${(tt.lineHeight ?? 1.55)};

  --ft-card-bg: ${c.bg || "var(--green)"};
  --ft-card-radius: ${(c.radius ?? 12)}px;
  --ft-card-shadow: ${c.shadow || "0 4px 15px rgba(0,0,0,0.12)"};
  --ft-name-color: ${c.nameColor || "#fff"};
  --ft-name-size: ${(c.nameSize ?? 16)}px;
  --ft-name-weight: ${(c.nameWeight ?? 800)};
  --ft-role-color: ${c.roleColor || "var(--gold)"};
  --ft-role-size: ${(c.roleSize ?? 13)}px;
  --ft-role-weight: ${(c.roleWeight ?? 700)};
  --ft-hover-lift: ${(c.hoverLift ?? 6)}px;
  --ft-hover-shadow: ${c.hoverShadow || "0 10px 25px rgba(0,0,0,0.25)"};

  --ft-photo-size: ${(c.photoSize ?? 120)}px;
  --ft-photo-radius: ${(c.photoRadius ?? 999)}px;
  --ft-photo-border: ${c.photoBorder || "3px solid rgba(255,255,255,0.25)"};

  --ft-link-bg: ${b.bg || "rgba(0,0,0,0.06)"};
  --ft-link-border: ${b.border || "1px solid rgba(0,0,0,0.10)"};
  --ft-link-color: ${b.color || "#111"};
  --ft-link-radius: ${(b.radius ?? 999)}px;
  --ft-link-pad-y: ${(b.padY ?? 8)}px;
  --ft-link-pad-x: ${(b.padX ?? 12)}px;
  --ft-link-font: ${(b.fontSize ?? 13)}px;
  --ft-link-weight: ${(b.fontWeight ?? 800)};
  --ft-link-hover-bg: ${b.hoverBg || "rgba(0,0,0,0.10)"};

  --ft-m-pad-x: ${(m.sectionPadX ?? 16)}px;
  --ft-m-pad-y: ${(m.sectionPadY ?? 30)}px;
  --ft-m-h2-size: ${(m.h2Size ?? 18)}px;
  --ft-m-logo-img-maxw: ${(m.logoImgMaxWidth ?? 200)}px;
  --ft-m-photo-size: ${(m.photoSize ?? 96)}px;
}
`.trim();

  const id = "ftAppearanceVars";
  const old = document.getElementById(id);
  if (old) old.remove();
  const style = document.createElement("style");
  style.id = id;
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

    if (data) {
      applySiteAppearance(data);
      applyFichaTecnicaAppearance(data);
    }
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
