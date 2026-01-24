export function setYear(){
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

export async function fetchPesquisasPublic(){
  const supabase = window?.supabaseClient || null;
  if (supabase) {
    try {
      console.log("[HOME] Supabase OK, carregando pesquisas do DB");
      const { data, error } = await supabase
        .from("pesquisas")
        .select("id,slug,titulo,ano_base,ordem,status,capa_url,descricao_curta,sinopse,relatorio_pdf_url,leitura_url,csv_fallback,config_json")
        .eq("status", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapPesquisaFromDb);
    } catch (err) {
      console.warn("[HOME] Fallback JSON local (motivo: Supabase)", err?.message || err);
    }
  } else {
    console.warn("[HOME] Fallback JSON local (motivo: Supabase client ausente)");
  }

  const res = await fetch("/data/pesquisas.json", { cache: "no-store" })
    .catch(() => fetch("/public/data/pesquisas.json", { cache: "no-store" }))
    .catch(() => fetch("/data/pesquisas.json"));
  if (!res || !res.ok) {
    console.error("[HOME] Nem Supabase nem JSON local disponível");
    return [];
  }
  return await res.json();
}

function mapPesquisaFromDb(row){
  const cfg = row?.config_json || {};
  const mapa = {
    ...(cfg.mapa || {}),
    csvUrl: row.csv_fallback || cfg?.mapa?.csvUrl || ""
  };
  const fichaTecnica = cfg.fichaTecnica || {};
  const pesquisaResumo = cfg.pesquisaResumo || {};

  return {
    dbId: row.id,
    _dbId: row.id,
    id: row.slug || row.id,
    titulo: row.titulo,
    anoBase: row.ano_base,
    ano_base: row.ano_base ?? "",
    ordem: row.ordem ?? 0,
    status: !!row.status,
    slug: row.slug,
    capa: row.capa_url || cfg.capa || "",
    descricaoCurta: row.descricao_curta || "",
    sinopse: row.sinopse || "",
    relatorioPdf: row.relatorio_pdf_url || cfg.relatorioPdf || "",
    leituraUrl: row.leitura_url || "",
    mapa,
    fichaTecnica,
    pesquisaResumo
  };
}

export function wireDropdown(pesquisas){
  const dd = document.getElementById("pesquisasDropdown");
  const btn = dd?.querySelector("button");
  const panel = dd?.querySelector(".dropdown-panel");
  if (!dd || !btn || !panel) return;

  panel.innerHTML = pesquisas.map(p => `
    <a class="dropdown-item" href="/${escapeHtml(p.slug)}" data-link role="menuitem">
      <strong>${escapeHtml(p.titulo)}</strong>
      <small>Ano base: ${escapeHtml(p.anoBase || "")}</small>
    </a>
  `).join("");

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
