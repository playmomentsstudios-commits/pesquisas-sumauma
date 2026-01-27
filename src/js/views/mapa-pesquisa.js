import { escapeHtml } from "../utils.js";
import { withBase } from "../basepath.js";

function tabs(slug){
  const s = escapeHtml(slug);
  const tab = (sub, label) => {
    const isActive = sub === "mapa";
    return `<a class="tab ${isActive ? "tab-active" : "tab-idle"}" href="${withBase(`/${s}/${sub}`)}" data-link>${label}</a>`;
  };
  return `
    <div class="subbar">
      <div class="subbar-right">
        ${tab("pesquisa","Pesquisa")}
        ${tab("relatorio","Relatório")}
        ${tab("mapa","Mapa")}
        ${tab("ficha-tecnica","Ficha Técnica")}
      </div>
    </div>
  `;
}

function cardHtml(p){
  const esc = (v) => escapeHtml(String(v ?? ""));
  const row = (label, value, isLink=false) => {
    if (!value) return "";
    const v = String(value);
    if (isLink) return `<div class="mp-row"><b>${esc(label)}:</b> <a href="${esc(v)}" target="_blank" rel="noreferrer">Abrir</a></div>`;
    return `<div class="mp-row"><b>${esc(label)}:</b> ${esc(v)}</div>`;
  };

  return `
    <div class="mp-card">
      <div class="mp-title">${esc(p.nome || "")}</div>
      <div class="mp-sub">${esc(p.cidade || "")}/${esc(p.uf || "")}${p.territorio ? " • " + esc(p.territorio) : ""}</div>
      ${p.categoria ? `<div class="mp-chip">${esc(p.categoria)}</div>` : ""}

      ${p.descricao ? `<div class="mp-desc">${esc(p.descricao)}</div>` : ""}

      <div class="mp-grid">
        ${row("Contato", p.contato)}
        ${row("WhatsApp", p.whatsapp)}
        ${row("E-mail", p.email)}
        ${row("Instagram", p.instagram)}
        ${row("Facebook", p.facebook)}
        ${row("Site", p.site, true)}
        ${row("Link", p.link, true)}
      </div>

      ${p.observacao ? `<div class="mp-obs"><b>Obs:</b> ${esc(p.observacao)}</div>` : ""}
    </div>
  `;
}

async function getPesquisaIdBySlug(slug){
  const supabase = window?.supabaseClient;
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("pesquisas")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[Mapa] erro buscando pesquisa_id por slug:", error);
    return null;
  }
  return data?.id || null;
}

async function loadPontosByPesquisaId(pesquisaId, opts = {}){
  const apiUrl = opts?.apiUrl;
  if (apiUrl) {
    try {
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        if (payload && Array.isArray(payload.data)) {
          return payload.data.filter(r => typeof r.lat === "number" && typeof r.lng === "number");
        }
      } else {
        console.warn("[Mapa] /api/pontos retornou erro:", res.status);
      }
    } catch (err) {
      console.warn("[Mapa] erro ao carregar /api/pontos:", err);
    }
  }

  const supabase = window?.supabaseClient;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("pontos")
    .select("*")
    .eq("pesquisa_id", pesquisaId)
    .eq("ativo", true);

  if (error) {
    console.warn("[Mapa] erro buscando pontos:", error);
    return [];
  }

  return (data || []).filter(r => typeof r.lat === "number" && typeof r.lng === "number");
}

export default async function renderMapaPesquisa(p){
  const slug = p.slug;
  const mapId = `leaflet-map-${slug.replace(/[^a-z0-9_-]/gi,"")}`;

  const html = `
    ${tabs(slug)}

    <section class="page">
      <div class="page-head">
        <div class="kicker">
          <span class="badge">Ano base: ${escapeHtml(p.anoBase || "")}</span>
        </div>
        <h2>Mapa</h2>
        <p>Selecione um ponto no mapa ou use a busca para localizar rapidamente.</p>
      </div>
    </section>

    <section class="page" style="margin-top:14px">
      <div class="map-shell">
        <aside class="map-side">
          <div class="map-side-head">
            <div class="map-side-title">Pontos cadastrados</div>
            <div class="map-side-meta" id="mp-counter">Carregando…</div>
          </div>

          <input class="map-search" id="mp-search" type="search" placeholder="Buscar por nome, cidade ou categoria…" />

          <div class="map-list" id="mp-list">
            <div class="muted">Carregando pontos…</div>
          </div>
        </aside>

        <div class="map-main">
          <div id="${mapId}" class="leaflet-map"></div>
        </div>
      </div>
    </section>
  `;

  queueMicrotask(async () => {
    try {
      const supabase = window?.supabaseClient;
      if (!supabase) {
        console.warn("[Mapa] supabaseClient não encontrado.");
        const list = document.getElementById("mp-list");
        if (list) list.innerHTML = `<div class="muted">Mapa indisponível (Supabase não configurado).</div>`;
        return;
      }

      const pesquisaId = p.dbId || p._dbId || (await getPesquisaIdBySlug(slug));
      if (!pesquisaId) {
        const list = document.getElementById("mp-list");
        if (list) list.innerHTML = `<div class="muted">Não consegui identificar a pesquisa no banco.</div>`;
        return;
      }

      const opts = {
        apiUrl: `/api/pontos?pesquisa_id=${escapeHtml(pesquisaId)}&ativo=true`,
      };

      const pontos = await loadPontosByPesquisaId(pesquisaId, opts);

      const counter = document.getElementById("mp-counter");
      if (counter) counter.textContent = `${pontos.length} ponto${pontos.length === 1 ? "" : "s"}`;

      const mapEl = document.getElementById(mapId);
      if (!mapEl || !window.L) return;

      const map = L.map(mapId, { scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      const markers = [];
      const bounds = [];

      const makePopup = (pt) => cardHtml(pt);

      pontos.forEach((pt) => {
        const m = L.marker([pt.lat, pt.lng]).addTo(map);
        m.bindPopup(makePopup(pt), { maxWidth: 380 });

        m.on("click", () => {
          map.setView([pt.lat, pt.lng], Math.max(map.getZoom(), 13), { animate: true });
          m.openPopup();
        });

        markers.push({ pt, m });
        bounds.push([pt.lat, pt.lng]);
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
      else map.setView([-14.2350, -51.9253], 4);

      const listEl = document.getElementById("mp-list");
      const searchEl = document.getElementById("mp-search");

      const renderList = () => {
        const q = String(searchEl?.value || "").trim().toLowerCase();
        const filtered = markers.filter(({ pt }) => {
          if (!q) return true;
          const hay = `${pt.nome || ""} ${pt.cidade || ""} ${pt.uf || ""} ${pt.categoria || ""}`.toLowerCase();
          return hay.includes(q);
        });

        if (listEl) {
          if (!filtered.length) {
            listEl.innerHTML = `<div class="muted">Nenhum ponto encontrado.</div>`;
            return;
          }

          listEl.innerHTML = filtered.map(({ pt }, idx) => `
            <button class="map-item" data-idx="${idx}">
              <div class="map-item-title">${escapeHtml(pt.nome || "")}</div>
              <div class="map-item-sub">${escapeHtml(pt.cidade || "")}/${escapeHtml(pt.uf || "")}${pt.categoria ? " • " + escapeHtml(pt.categoria) : ""}</div>
            </button>
          `).join("");

          listEl.querySelectorAll(".map-item").forEach((btn) => {
            btn.addEventListener("click", () => {
              const i = Number(btn.getAttribute("data-idx"));
              const item = filtered[i];
              if (!item) return;
              map.setView([item.pt.lat, item.pt.lng], 13, { animate: true });
              item.m.openPopup();
            });
          });
        }
      };

      renderList();
      searchEl?.addEventListener("input", renderList);

    } catch (e) {
      console.warn("[Mapa] erro geral:", e);
      const list = document.getElementById("mp-list");
      if (list) list.innerHTML = `<div class="muted">Erro ao carregar o mapa.</div>`;
    }
  });

  return html;
}
