export function getBasePath(){
  // override manual se quiser
  if (window.BASE_PATH) return String(window.BASE_PATH).replace(/\/+$/,"");

  // GitHub Pages: user.github.io/<repo>/
  if (location.hostname.endsWith("github.io")){
    const seg = location.pathname.split("/").filter(Boolean)[0];
    return seg ? "/" + seg : "";
  }

  return "";
}

export function stripBase(pathname){
  const base = getBasePath();
  if (base && pathname.startsWith(base)){
    const p = pathname.slice(base.length);
    return p.startsWith("/") ? p : "/" + p;
  }
  return pathname || "/";
}

export function withBase(path){
  const base = getBasePath();
  if (!path) return base || "/";
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return path;
  if (path.startsWith(base + "/")) return path;
  return path.startsWith("/") ? base + path : base + "/" + path;
}
