// src/js/map.js
// Motor do mapa: Leaflet + CSV + filtros/lista
(function(){
  const STATE = {
    map: null,
    layer: null,
    all: [],
    filtered: [],
    markersById: new Map(),
    currentSlug: null
  };

  // expõe global para as views chamarem
  window.SumaumaMap = {
    init: async function(opts){
      // opts: { csvUrl, mapId, listId, searchId, stateId, cityId, catId }
      await waitForLeaflet();

      // evita reinicializar se trocar de rota
      if (STATE.map) {
        try { STATE.map.remove(); } catch(e){}
        STATE.map = null;
        STATE.layer = null;
        STATE.markersById.clear();
      }

      const mapEl = document.getElementById(opts.mapId);
      if (!mapEl) return;

      // cria mapa
      STATE.map = L.map(opts.mapId, { zoomControl: true }).setView([-14.235, -51.925], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(STATE.map);

      STATE.layer = L.layerGroup().addTo(STATE.map);

      // carrega dados
      const rows = await fetchCsv(opts.csvUrl);
      STATE.all = normalizeRows(rows);
      STATE.filtered = [...STATE.all];

      // UI refs
      const listEl = document.getElementById(opts.listId);
      const searchEl = document.getElementById(opts.searchId);
      const stateEl = document.getElementById(opts.stateId);
      const cityEl = document.getElementById(opts.cityId);
      const catEl = document.getElementById(opts.catId);

      // popula selects
      fillSelect(stateEl, unique(STATE.all.map(r => r.estado)).filter(Boolean), "Todos os estados");
      fillSelect(cityEl, unique(STATE.all.map(r => r.cidade)).filter(Boolean), "Todas as cidades");
      fillSelect(catEl, unique(STATE.all.map(r => r.categoria)).filter(Boolean), "Todas as categorias");

      // eventos
      const apply = () => {
        const q = (searchEl?.value || "").trim().toLowerCase();
        const uf = stateEl?.value || "";
        const city = cityEl?.value || "";
        const cat = catEl?.value || "";

        STATE.filtered = STATE.all.filter(r => {
          if (q && !r.nome.toLowerCase().includes(q)) return false;
          if (uf && r.estado !== uf) return false;
          if (city && r.cidade !== city) return false;
          if (cat && r.categoria !== cat) return false;
          return true;
        });

        // atualiza city com base no estado selecionado (opcional, mas deixa mais profissional)
        if (stateEl) {
          const cities = unique(
            STATE.all
              .filter(r => !uf || r.estado === uf)
              .map(r => r.cidade)
          ).filter(Boolean);

          const current = cityEl?.value || "";
          fillSelect(cityEl, cities, "Todas as cidades");
          if (cities.includes(current)) cityEl.value = current;
        }

        renderMarkers(listEl);
      };

      searchEl?.addEventListener("input", debounce(apply, 150));
      stateEl?.addEventListener("change", apply);
      cityEl?.addEventListener("change", apply);
      catEl?.addEventListener("change", apply);

      // primeira renderização
      renderMarkers(listEl);

      function renderMarkers(listEl){
        // limpa
        STATE.layer.clearLayers();
        STATE.markersById.clear();

        // markers
        const bounds = [];
        for (const r of STATE.filtered) {
          if (!isFinite(r.lat) || !isFinite(r.lng)) continue;

          const color = colorByCategory(r.categoria);
          const marker = L.circleMarker([r.lat, r.lng], {
            radius: 8,
            color: color,
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
            <div class="list-item" data-id="${escapeHtml(r._id)}">
              <strong>${escapeHtml(r.nome || "Sem nome")}</strong>
              <small>${escapeHtml(r.territorio || "")}${r.territorio ? " • " : ""}${escapeHtml(r.cidade || "")}/${escapeHtml(r.estado || "")}${(r.categoria ? " • " + escapeHtml(r.categoria) : "")}</small>
            </div>
          `).join("") || `<div class="empty">Nenhum resultado com esses filtros.</div>`;

          listEl.querySelectorAll(".list-item").forEach(el => {
            el.addEventListener("click", () => {
              const id = el.getAttribute("data-id");
              const mk = STATE.markersById.get(id);
              const row = STATE.filtered.find(x => x._id === id);
              if (mk && row && isFinite(row.lat) && isFinite(row.lng)) {
                STATE.map.setView([row.lat, row.lng], 12, { animate: true });
                mk.openPopup();
              }
            });
          });
        }

        // zoom
        if (bounds.length >= 2) {
          STATE.map.fitBounds(bounds, { padding: [30, 30] });
        } else if (bounds.length === 1) {
          STATE.map.setView(bounds[0], 12);
        } else {
          STATE.map.setView([-14.235, -51.925], 4);
        }
      }
    }
  };

  // ---------- helpers ----------
  function waitForLeaflet(){
    return new Promise((resolve) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (window.L && window.L.map) {
          clearInterval(t);
          resolve();
        } else if (Date.now() - start > 8000) {
          clearInterval(t);
          resolve(); // não travar
        }
      }, 60);
    });
  }

  async function fetchCsv(url){
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const text = await res.text();
    return parseCsv(text);
  }

  function normalizeRows(rows){
    // tenta mapear campos comuns (você pode ajustar depois)
    return rows.map((r, idx) => {
      const nome = pick(r, ["nome","Nome","participante","Participante"]);
      const categoria = pick(r, ["categoria","Categoria"]);
      const territorio = pick(r, ["territorio","Território","Territorio"]);
      const cidade = pick(r, ["cidade","Cidade"]);
      const estado = pick(r, ["estado","Estado","UF","uf"]);
      const lat = toNum(pick(r, ["latitude","Latitude","lat","Lat"]));
      const lng = toNum(pick(r, ["longitude","Longitude","lng","Lng","lon","Lon"]));

      const telefone = pick(r, ["telefone","Telefone","whatsapp","WhatsApp"]);
      const email = pick(r, ["email","Email","e-mail","E-mail"]);
      const instagram = pick(r, ["instagram","Instagram"]);
      const site = pick(r, ["site","Site","url","URL"]);

      return {
        _id: `row-${idx+1}`,
        nome: (nome || "").trim(),
        categoria: (categoria || "").trim(),
        territorio: (territorio || "").trim(),
        cidade: (cidade || "").trim(),
        estado: (estado || "").trim(),
        lat: lat,
        lng: lng,
        telefone: (telefone || "").trim(),
        email: (email || "").trim(),
        instagram: (instagram || "").trim(),
        site: (site || "").trim()
      };
    });
  }

  function popupHtml(r){
    const lines = [];
    lines.push(`<div style="font-family:Arial,sans-serif">`);
    lines.push(`<div style="font-weight:bold;color:#0f3d2e;font-size:14px">${escapeHtml(r.nome || "")}</div>`);
    lines.push(`<div style="color:#555;margin-top:3px">${escapeHtml(r.territorio || "")}</div>`);
    lines.push(`<div style="color:#555;margin-top:3px">${escapeHtml(r.cidade || "")}/${escapeHtml(r.estado || "")}</div>`);
    if (r.categoria) lines.push(`<div style="margin-top:6px;font-weight:bold;color:#5a2a12">${escapeHtml(r.categoria)}</div>`);

    const contact = [];
    if (r.telefone) contact.push(`📞 ${escapeHtml(r.telefone)}`);
    if (r.email) contact.push(`✉️ ${escapeHtml(r.email)}`);
    if (r.instagram) contact.push(`📷 ${escapeHtml(r.instagram)}`);
    if (r.site) contact.push(`🔗 ${escapeHtml(r.site)}`);

    if (contact.length) {
      lines.push(`<div style="margin-top:8px;color:#444;font-size:12px;line-height:1.5">${contact.join("<br>")}</div>`);
    }
    lines.push(`</div>`);
    return lines.join("");
  }

  function colorByCategory(cat){
    const c = (cat || "").toLowerCase();
    if (c.includes("cultural")) return "#0f3d2e";          // verde
    if (c.includes("comunic")) return "#5a2a12";           // marrom
    return "#1f2937";                                     // neutro
  }

  function pick(obj, keys){
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return "";
  }

  function toNum(v){
    if (v === null || v === undefined) return NaN;
    const s = String(v).replace(",", ".").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function unique(arr){
    return [...new Set(arr.filter(x => x !== undefined && x !== null && String(x).trim() !== ""))].sort((a,b)=>String(a).localeCompare(String(b)));
  }

  function fillSelect(select, items, placeholder){
    if (!select) return;
    const current = select.value || "";
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    if (items.includes(current)) select.value = current;
    else select.value = "";
  }

  function debounce(fn, ms){
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function parseCsv(text){
    // parser simples (suporta aspas)
    const rows = [];
    const lines = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").filter(l => l.trim() !== "");
    if (!lines.length) return rows;

    const header = splitCsvLine(lines[0]);
    for (let i=1;i<lines.length;i++){
      const cols = splitCsvLine(lines[i]);
      const obj = {};
      for (let c=0;c<header.length;c++){
        obj[header[c]] = cols[c] ?? "";
      }
      rows.push(obj);
    }
    return rows;

    function splitCsvLine(line){
      const out = [];
      let cur = "";
      let inQ = false;
      for (let i=0;i<line.length;i++){
        const ch = line[i];
        if (ch === '"' ) {
          if (inQ && line[i+1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === "," && !inQ) {
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
})();
