// src/js/map.js
// Leaflet + CSV + Filtros + Lista + Zoom automático
(function () {
  const STATE = {
    map: null,
    layer: null,
    all: [],
    filtered: [],
    markersById: new Map(),
  };

  // Exposto globalmente para ser chamado pela view do mapa
  window.SumaumaMap = {
    init: async function (opts) {
      // opts: { csvUrl, mapId, listId, searchId, stateId, cityId, catId }
      await waitForLeaflet();

      // Se reiniciar em outra rota, remove mapa anterior
      if (STATE.map) {
        try { STATE.map.remove(); } catch (e) {}
        STATE.map = null;
        STATE.layer = null;
        STATE.markersById.clear();
      }

      const mapEl = document.getElementById(opts.mapId);
      if (!mapEl) return;

      // cria mapa (Brasil como view padrão)
      STATE.map = L.map(opts.mapId, { zoomControl: true }).setView([-14.235, -51.925], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(STATE.map);

      STATE.layer = L.layerGroup().addTo(STATE.map);

      // carrega CSV
      const rows = await fetchCsv(opts.csvUrl);
      STATE.all = normalizeRows(rows);
      STATE.filtered = [...STATE.all];

      // refs UI
      const listEl = document.getElementById(opts.listId);
      const searchEl = document.getElementById(opts.searchId);
      const stateEl = document.getElementById(opts.stateId);
      const cityEl = document.getElementById(opts.cityId);
      const catEl = document.getElementById(opts.catId);

      // popula selects
      fillSelect(stateEl, unique(STATE.all.map(r => r.estado)), "Todos os estados");
      fillSelect(cityEl, unique(STATE.all.map(r => r.cidade)), "Todas as cidades");
      fillSelect(catEl, unique(STATE.all.map(r => r.categoria)), "Todas as categorias");

      const apply = () => {
        const q = (searchEl?.value || "").trim().toLowerCase();
        const uf = stateEl?.value || "";
        const city = cityEl?.value || "";
        const cat = catEl?.value || "";

        // filtra
        STATE.filtered = STATE.all.filter(r => {
          if (q && !String(r.nome || "").toLowerCase().includes(q)) return false;
          if (uf && r.estado !== uf) return false;
          if (city && r.cidade !== city) return false;
          if (cat && r.categoria !== cat) return false;
          return true;
        });

        // atualiza cidades quando estado selecionado
        if (stateEl && cityEl) {
          const cities = unique(
            STATE.all
              .filter(r => !uf || r.estado === uf)
              .map(r => r.cidade)
          );
          const prev = cityEl.value || "";
          fillSelect(cityEl, cities, "Todas as cidades");
          if (cities.includes(prev)) cityEl.value = prev;
        }

        render(listEl);
      };

      searchEl?.addEventListener("input", debounce(apply, 150));
      stateEl?.addEventListener("change", apply);
      cityEl?.addEventListener("change", apply);
      catEl?.addEventListener("change", apply);

      // primeira renderização
      render(listEl);
    }
  };

  // ---------- Render ----------
  function render(listEl) {
    STATE.layer.clearLayers();
    STATE.markersById.clear();

    const bounds = [];

    for (const r of STATE.filtered) {
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;

      const color = colorByCategory(r.categoria);

      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 8,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9
      });

      marker.bindPopup(popupHtml(r), { maxWidth: 320 });
      marker.addTo(STATE.layer);

      STATE.markersById.set(r._id, marker);
      bounds.push([r.lat, r.lng]);
    }

    // lista
    if (listEl) {
      listEl.innerHTML = STATE.filtered.map(r => `
        <div class="list-item" data-id="${esc(r._id)}">
          <strong>${esc(r.nome || "Sem nome")}</strong>
          <small>${esc(r.territorio || "")}${r.territorio ? " • " : ""}${esc(r.cidade || "")}/${esc(r.estado || "")}${r.categoria ? " • " + esc(r.categoria) : ""}</small>
        </div>
      `).join("");

      if (!STATE.filtered.length) {
        listEl.innerHTML = `<div class="empty">Nenhum resultado com esses filtros.</div>`;
      }

      listEl.querySelectorAll(".list-item").forEach(el => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          const row = STATE.filtered.find(x => x._id === id);
          const mk = STATE.markersById.get(id);
          if (row && mk && Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
            STATE.map.setView([row.lat, row.lng], 12, { animate: true });
            mk.openPopup();
          }
        });
      });
    }

    // zoom automático
    if (bounds.length >= 2) {
      STATE.map.fitBounds(bounds, { padding: [30, 30] });
    } else if (bounds.length === 1) {
      STATE.map.setView(bounds[0], 12);
    } else {
      STATE.map.setView([-14.235, -51.925], 4);
    }
  }

  // ---------- CSV ----------
  async function fetchCsv(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const text = await res.text();

    // suporta CSV com ; ou ,
    const firstLine = text.split(/\r?\n/).find(l => l.trim() !== "") || "";
    const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

    return parseCsv(text, delimiter);
  }

  function parseCsv(text, delimiter) {
    const rows = [];
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim() !== "");
    if (!lines.length) return rows;

    const header = splitLine(lines[0], delimiter);
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i], delimiter);
      const obj = {};
      for (let c = 0; c < header.length; c++) {
        obj[header[c]] = cols[c] ?? "";
      }
      rows.push(obj);
    }
    return rows;

    function splitLine(line, delim) {
      const out = [];
      let cur = "";
      let inQ = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === delim && !inQ) {
          out.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur.trim());
      return out;
    }
  }

  // ---------- Normalize ----------
  function normalizeRows(rows) {
    return rows.map((r, idx) => {
      const nome = pick(r, ["Nome", "nome", "Participante", "participante"]);
      const categoria = pick(r, ["Categoria", "categoria"]);
      const territorio = pick(r, ["Território", "Territorio", "territorio"]);
      const cidade = pick(r, ["Cidade", "cidade"]);
      const estado = pick(r, ["UF", "uf", "Estado", "estado"]);
      const lat = toNum(pick(r, ["Latitude", "latitude", "Lat", "lat"]));
      const lng = toNum(pick(r, ["Longitude", "longitude", "Lng", "lng", "Lon", "lon"]));

      const telefone = pick(r, ["Telefone", "telefone", "WhatsApp", "whatsapp"]);
      const email = pick(r, ["Email", "email", "E-mail", "e-mail"]);
      const instagram = pick(r, ["Instagram", "instagram"]);
      const site = pick(r, ["Site", "site", "URL", "url"]);

      return {
        _id: `row-${idx + 1}`,
        nome: String(nome || "").trim(),
        categoria: String(categoria || "").trim(),
        territorio: String(territorio || "").trim(),
        cidade: String(cidade || "").trim(),
        estado: String(estado || "").trim(),
        lat,
        lng,
        telefone: String(telefone || "").trim(),
        email: String(email || "").trim(),
        instagram: String(instagram || "").trim(),
        site: String(site || "").trim(),
      };
    });
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return "";
  }

  function toNum(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).replace(",", ".").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  // ---------- UI helpers ----------
  function unique(arr) {
    return [...new Set(arr.map(x => String(x || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  function fillSelect(select, items, placeholder) {
    if (!select) return;
    const current = select.value || "";
    select.innerHTML =
      `<option value="">${placeholder}</option>` +
      items.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if (items.includes(current)) select.value = current;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // ---------- Visual ----------
  function colorByCategory(cat) {
    const c = String(cat || "").toLowerCase();
    if (c.includes("cultural")) return "#0f3d2e";     // verde
    if (c.includes("comunic")) return "#5a2a12";      // marrom
    return "#1f2937";                                 // neutro
  }

  function popupHtml(r) {
    const parts = [];
    parts.push(`<div style="font-family:Arial,sans-serif">`);
    parts.push(`<div style="font-weight:bold;color:#0f3d2e;font-size:14px">${esc(r.nome || "")}</div>`);
    if (r.territorio) parts.push(`<div style="color:#555;margin-top:3px">${esc(r.territorio)}</div>`);
    parts.push(`<div style="color:#555;margin-top:3px">${esc(r.cidade || "")}/${esc(r.estado || "")}</div>`);
    if (r.categoria) parts.push(`<div style="margin-top:6px;font-weight:bold;color:#5a2a12">${esc(r.categoria)}</div>`);

    const contact = [];
    if (r.telefone) contact.push(`📞 ${esc(r.telefone)}`);
    if (r.email) contact.push(`✉️ ${esc(r.email)}`);
    if (r.instagram) contact.push(`📷 ${esc(r.instagram)}`);
    if (r.site) contact.push(`🔗 ${esc(r.site)}`);

    if (contact.length) {
      parts.push(`<div style="margin-top:8px;color:#444;font-size:12px;line-height:1.5">${contact.join("<br>")}</div>`);
    }
    parts.push(`</div>`);
    return parts.join("");
  }

  // ---------- Leaflet wait ----------
  function waitForLeaflet() {
    return new Promise((resolve) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (window.L && window.L.map) {
          clearInterval(t);
          resolve();
        } else if (Date.now() - start > 8000) {
          clearInterval(t);
          resolve(); // não trava o app
        }
      }, 60);
    });
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
