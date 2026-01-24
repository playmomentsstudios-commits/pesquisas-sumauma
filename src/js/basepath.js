export function getBasePath(){
  // Se houver override manual:
  if (window.BASE_PATH) return String(window.BASE_PATH).replace(/\/+$/,"");

  const host = location.hostname;
  const path = location.pathname;

  // GitHub Pages: https://user.github.io/<repo>/
  // Base é o primeiro segmento do pathname
  if (host.endsWith("github.io")) {
    const seg = path.split("/").filter(Boolean)[0]; // ex: "pesquisas-sumauma"
    return seg ? `/${seg}` : "";
  }

  // Domínio normal (Netlify etc.)
  return "";
}

export function withBase(p){
  const base = getBasePath();
  if (!p) return base || "";
  // se p já tiver base, não duplica
  if (base && p.startsWith(base + "/")) return p;
  if (!base) return p;
  if (p.startsWith("/")) return base + p;
  return base + "/" + p;
}
