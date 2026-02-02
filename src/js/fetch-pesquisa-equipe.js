import { withBase } from "./basepath.js";

const STORAGE_BUCKETS = ["pesquisas", "mapas", "logos", "equipe", "site-assets"];

function isHttp(u) {
  return /^https?:\/\//i.test(u || "");
}

function getSupabaseUrl() {
  return String(window?.SUPABASE_URL || "").replace(/\/+$/, "");
}

function publicStorageUrl(bucket, path) {
  const base = getSupabaseUrl();
  if (!base) return "";
  const clean = String(path || "").replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${clean}`;
}

function normalizeMaybeStorageUrl(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (isHttp(v)) return v;

  const storagePrefix = v.replace(/^\//, "");
  if (storagePrefix.startsWith("storage/v1/object/public/")) {
    const base = getSupabaseUrl();
    return base ? `${base}/${storagePrefix}` : null;
  }

  const match = storagePrefix.match(/^([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1].toLowerCase();
  if (!STORAGE_BUCKETS.includes(bucket)) return null;
  return publicStorageUrl(bucket, match[2]);
}

function fixMaybeLocalUrl(u) {
  if (!u) return u;
  const storageUrl = normalizeMaybeStorageUrl(u);
  if (storageUrl) return storageUrl;
  if (isHttp(u)) return u;
  const cleaned = String(u).replace(/^[./]+/, "");
  const normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return withBase(normalized);
}

function normalizeEquipeData(data) {
  return (data ?? []).map((item) => ({
    ...item,
    foto_url: item?.foto_url ? fixMaybeLocalUrl(item.foto_url) : null
  }));
}

export async function fetchPesquisaEquipe(pesquisaId) {
  if (!pesquisaId) {
    console.warn("[fetchPesquisaEquipe] pesquisaId vazio — não buscando equipe.");
    return { data: [], error: null };
  }

  const supabase = window?.supabaseClient || null;
  if (!supabase) {
    console.warn("[fetchPesquisaEquipe] Supabase indisponível — usando fallback local.");
    return { data: [], error: null };
  }

  let res = await supabase
    .from("pesquisa_equipe")
    .select("id,pesquisa_id,ordem,nome,funcao,bio,foto_url,linkedin")
    .eq("pesquisa_id", pesquisaId)
    .order("ordem", { ascending: true });

  if (res.error) {
    console.error("[fetchPesquisaEquipe] erro no select padrão:", res.error);

    const fallback = await supabase
      .from("pesquisa_equipe")
      .select("*")
      .eq("pesquisa_id", pesquisaId)
      .order("ordem", { ascending: true });

    if (fallback.error) {
      console.error("[fetchPesquisaEquipe] erro também no fallback:", fallback.error);
      return { data: [], error: fallback.error };
    }

    return { data: normalizeEquipeData(fallback.data), error: null };
  }

  return { data: normalizeEquipeData(res.data), error: null };
}
