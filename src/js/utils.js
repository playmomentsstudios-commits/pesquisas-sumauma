export function setYear(){
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

export async function fetchPesquisas(){
  const res = await fetch("./public/data/pesquisas.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar pesquisas.json");
  return await res.json();
}

export function wireDropdown(pesquisas){
  const dd = document.getElementById("pesquisasDropdown");
  const btn = dd?.querySelector("button");
  const panel = dd?.querySelector(".dropdown-panel");
  if (!dd || !btn || !panel) return;

  // monta itens
  panel.innerHTML = pesquisas.map(p => `
    <a class="dropdown-item" href="/${escapeHtml(p.slug)}" data-link role="menuitem">
      <strong>${escapeHtml(p.titulo)}</strong>
      <small>Ano base: ${escapeHtml(p.anoBase || "")}</small>
    </a>
  `).join("");

  // começa FECHADO
  dd.classList.remove("open");
  btn.setAttribute("aria-expanded","false");

  function close(){
    dd.classList.remove("open");
    btn.setAttribute("aria-expanded","false");
  }
  function toggle(){
    const open = dd.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

export function spaLinkHandler(e, navigate){
  const a = e.target.closest("a[data-link]");
  if (!a) return;

  const href = a.getAttribute("href");
  if (!href) return;

  if (href.startsWith("http")) return;

  e.preventDefault();
  navigate(href);
}

export function getSpaRedirect(){
  const v = sessionStorage.getItem("spa_redirect");
  if (v) sessionStorage.removeItem("spa_redirect");
  return v;
}

export function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
