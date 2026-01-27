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

function normalizeStr(v){
  return String(v ?? "").trim();
}

function asLower(v){
  return normalizeStr(v).toLowerCase();
}

function isUrl(v){
  const s = normalizeStr(v);
  return /^https?:\/\//i.test(s);
}

function asLinkOrText(label, value){
  const esc = (x) => escapeHtml(String(x ?? ""));
  const v = normalizeStr(value);
  if (!v) return "";
  if (isUrl(v)) {
    return `<div class="mp-row"><b>${esc(label)}:</b> <a href="${esc(v)}" target="_blank" rel="noreferrer">${esc(v)}</a></div>`;
  }
  return `<div class="mp-row"><b>${esc(label)}:</b> ${esc(v)}</div>`;
}

function cardHtml(p){
  const esc = (v) => escapeHtml(String(v ?? ""));

  const nome = normalizeStr(p.nome);
  const cidade = normalizeStr(p.cidade);
  const uf = normalizeStr(p.uf);
  const territorio = normalizeStr(p.territorio);
  const categoria = normalizeStr(p.categoria);
  const descricao = normalizeStr(p.descricao);

  // Melhor visual do popup: título + local + chip + blocos de info
  return `
    <div class="mp-card">
      <div class="mp-head">
        <div class="mp-title">${esc(nome || "")}</div>
        <div class="mp-sub">
          ${esc(cidade || "")}${uf ? `/${esc(uf)}` : ""}${territorio ? ` • ${esc(territorio)}` : ""}
        </div>
        ${categoria ? `<div class="mp-chip">${esc(categoria)}</div>` : ""}
      </div>

      ${descricao ? `<div class="mp-desc">${esc(descricao)}</div>` : ""}

      <div class="mp-grid">
        ${asLinkOrText("Contato", p.contato)}
        ${asLinkOrText("WhatsApp", p.whatsapp)}
        ${asLinkOrText("E-mail", p.email)}
        ${asLinkOrText("Instagram", p.instagram)}
        ${asLinkOrText("Facebook", p.facebook)}
        ${asLinkOrText("Site", p.site)}
        ${asLinkOrText("Link", p.link)}
      </div>

      ${normalizeStr(p.observacao) ? `<div class="mp-obs"><b>Obs:</b> ${esc(p.observacao)}</div>` : ""}
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

function uniqueSorted(arr){
  const set = new Set(arr.map(v => normalizeStr(v)).filter(Boolean));
  return Array.from(set).sort((a,b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function buildSelectOptions(values, placeholder){
  const opts = [`<option value="">${escapeHtml(placeholder)}</option>`];
  values.forEach(v => opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`));
  return opts.join("");
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

          <!-- FILTROS (UF / Cidade / Categoria) -->
          <div class="map-filters" id="mp-filters">
            <select class="map-filter" id="mp-filter-uf" aria-label="Filtrar por estado (UF)">
              <option value="">Estado (UF)</option>
            </select>

            <select class="map-filter" id="mp-filter-cidade" aria-label="Filtrar por cidade" disabled>
              <option value="">Cidade</option>
            </select>

            <select class="map-filter" id="mp-filter-categoria" aria-label="Filtrar por categoria">
              <option value="">Categoria</option>
            </select>
          </div>

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

      const opts = { apiUrl: `/api/pontos?pesquisa_id=${escapeHtml(pesquisaId)}&ativo=true` };
      const pontos = await loadPontosByPesquisaId(pesquisaId, opts);

      const total = pontos.length;

      const counter = document.getElementById("mp-counter");
      if (counter) counter.textContent = `${total} ponto${total === 1 ? "" : "s"}`;

      const mapEl = document.getElementById(mapId);
      if (!mapEl || !window.L) return;

      const map = L.map(mapId, { scrollWheelZoom: true });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      const markers = [];
      const bounds = [];

      pontos.forEach((pt) => {
        const m = L.marker([pt.lat, pt.lng]).addTo(map);
        m.bindPopup(cardHtml(pt), { maxWidth: 420, closeButton: true });

        m.on("click", () => {
          map.setView([pt.lat, pt.lng], Math.max(map.getZoom(), 13), { animate: true });
          m.openPopup();
        });

        markers.push({ pt, m });
        bounds.push([pt.lat, pt.lng]);
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
      else map.setView([-14.2350, -51.9253], 4);

      // Elements
      const listEl = document.getElementById("mp-list");
      const searchEl = document.getElementById("mp-search");

      const ufEl = document.getElementById("mp-filter-uf");
      const cidadeEl = document.getElementById("mp-filter-cidade");
      const catEl = document.getElementById("mp-filter-categoria");

      // Build base options
      const ufs = uniqueSorted(pontos.map(x => x.uf));
      const categorias = uniqueSorted(pontos.map(x => x.categoria));

      if (ufEl) ufEl.innerHTML = buildSelectOptions(ufs, "Estado (UF)");
      if (catEl) catEl.innerHTML = buildSelectOptions(categorias, "Categoria");

      const updateCidadeOptions = () => {
        if (!cidadeEl) return;

        const uf = normalizeStr(ufEl?.value);
        const cidades = uniqueSorted(
          pontos
            .filter(x => !uf || normalizeStr(x.uf) === uf)
            .map(x => x.cidade)
        );

        cidadeEl.innerHTML = buildSelectOptions(cidades, "Cidade");
        cidadeEl.disabled = cidades.length === 0;
      };

      // Initial city options
      updateCidadeOptions();

      const applyFilters = () => {
        const q = asLower(searchEl?.value || "");
        const uf = normalizeStr(ufEl?.value);
        const cidade = normalizeStr(cidadeEl?.value);
        const categoria = normalizeStr(catEl?.value);

        return markers.filter(({ pt }) => {
          // filtros exatos
          if (uf && normalizeStr(pt.uf) !== uf) return false;
          if (cidade && normalizeStr(pt.cidade) !== cidade) return false;
          if (categoria && normalizeStr(pt.categoria) !== categoria) return false;

          // busca textual
          if (!q) return true;
          const hay = `${pt.nome || ""} ${pt.cidade || ""} ${pt.uf || ""} ${pt.categoria || ""} ${pt.territorio || ""}`.toLowerCase();
          return hay.includes(q);
        });
      };

      const renderList = () => {
        const filtered = applyFilters();
        const count = filtered.length;

        if (counter) {
          if (count === total) counter.textContent = `${total} ponto${total === 1 ? "" : "s"}`;
          else counter.textContent = `${count} de ${total} pontos`;
        }

        if (!listEl) return;

        if (!count) {
          listEl.innerHTML = `<div class="muted">Nenhum ponto encontrado.</div>`;
          return;
        }

        listEl.innerHTML = filtered.map(({ pt }, idx) => `
          <button class="map-item" data-idx="${idx}">
            <div class="map-item-title">${escapeHtml(pt.nome || "")}</div>
            <div class="map-item-sub">
              ${escapeHtml(pt.cidade || "")}/${escapeHtml(pt.uf || "")}
              ${pt.categoria ? " • " + escapeHtml(pt.categoria) : ""}
            </div>
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
      };

      // Events
      searchEl?.addEventListener("input", renderList);

      ufEl?.addEventListener("change", () => {
        // Ao mudar UF: reset cidade e recarrega opções de cidade
        updateCidadeOptions();
        if (cidadeEl) cidadeEl.value = "";
        renderList();
      });

      cidadeEl?.addEventListener("change", renderList);
      catEl?.addEventListener("change", renderList);

      renderList();

    } catch (e) {
      console.warn("[Mapa] erro geral:", e);
      const list = document.getElementById("mp-list");
      if (list) list.innerHTML = `<div class="muted">Erro ao carregar o mapa.</div>`;
    }
  });

  return html;
}
