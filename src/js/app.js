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


setYear();
const headerLogo = document.querySelector(".header-logo");
if (headerLogo) headerLogo.setAttribute("href", withBase("/"));
initHeaderSearch();
initRouter();
initFavicon();
