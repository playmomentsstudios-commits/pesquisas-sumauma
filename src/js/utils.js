import { withBase } from "./basepath.js";

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

  const res = await fetch(withBase("/data/pesquisas.json"), { cache: "no-store" })
    .catch(() => fetch(withBase("/public/data/pesquisas.json"), { cache: "no-store" }))
    .catch(() => fetch(withBase("/data/pesquisas.json")));
  if (!res || !res.ok) {
    console.error("[HOME] Nem Supabase nem JSON local disponível");
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizePesquisaPaths) : data;
}

function mapPesquisaFromDb(row){
  const cfg = row?.config_json || {};
  const mapa = {
    ...(cfg.mapa || {}),
    csvUrl: fixMaybeLocalUrl(row.csv_fallback || cfg?.mapa?.csvUrl || "")
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
    capa: fixMaybeLocalUrl(row.capa_url || cfg.capa || ""),
    descricaoCurta: row.descricao_curta || "",
    sinopse: row.sinopse || "",
    relatorioPdf: fixMaybeLocalUrl(row.relatorio_pdf_url || cfg.relatorioPdf || ""),
    leituraUrl: fixMaybeLocalUrl(row.leitura_url || ""),
    mapa,
    fichaTecnica: normalizeFichaTecnica(fichaTecnica),
    pesquisaResumo: normalizePesquisaResumo(pesquisaResumo)
  };
}

function normalizePesquisaPaths(p){
  if (!p || typeof p !== "object") return p;
  const mapa = p.mapa || {};
  return {
    ...p,
    capa: fixMaybeLocalUrl(p.capa || ""),
    relatorioPdf: fixMaybeLocalUrl(p.relatorioPdf || ""),
    leituraUrl: fixMaybeLocalUrl(p.leituraUrl || ""),
    mapa: {
      ...mapa,
      csvUrl: fixMaybeLocalUrl(mapa.csvUrl || "")
    },
    fichaTecnica: normalizeFichaTecnica(p.fichaTecnica || {}),
    pesquisaResumo: normalizePesquisaResumo(p.pesquisaResumo || {})
  };
}

function normalizeFichaTecnica(ft){
  const realizacao = ft.realizacao || {};
  const financiador = ft.financiador || {};
  const equipe = Array.isArray(ft.equipe) ? ft.equipe : [];
  return {
    ...ft,
    realizacao: {
      ...realizacao,
      logo: fixMaybeLocalUrl(realizacao.logo || "")
    },
    financiador: {
      ...financiador,
      logo: fixMaybeLocalUrl(financiador.logo || "")
    },
    equipe: equipe.map((person) => ({
      ...person,
      foto: fixMaybeLocalUrl(person?.foto || "")
    }))
  };
}

function normalizePesquisaResumo(resumo){
  const topicos = Array.isArray(resumo?.topicos) ? resumo.topicos : [];
  return {
    ...resumo,
    topicos: topicos.map((t) => ({
      ...t,
      imagem: fixMaybeLocalUrl(t?.imagem || "")
    }))
  };
}

function fixMaybeLocalUrl(u){
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const cleaned = String(u).replace(/^[./]+/, "");
  const normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return withBase(normalized);
}

export function wireDropdown(pesquisas){
  const dd = document.getElementById("pesquisasDropdown");
  const btn = dd?.querySelector("button");
  const panel = dd?.querySelector(".dropdown-panel");
  if (!dd || !btn || !panel) return;

  panel.innerHTML = pesquisas.map(p => {
    const slug = escapeHtml(p.slug);
    return `
      <a class="dropdown-item" href="${withBase("/" + slug)}" data-link role="menuitem">
        <strong>${escapeHtml(p.titulo)}</strong>
        <small>Ano base: ${escapeHtml(p.anoBase || "")}</small>
      </a>
    `;
  }).join("");

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
