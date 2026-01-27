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
      // opts: { csvUrl?, pesquisaId?, supabaseEnabled?, mapId, listId, searchId, stateId, cityId, catId }
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

      // carrega dados (Supabase ou CSV)
      const rows = await fetchRows(opts);
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

      marker.bindPopup(popupHtml(r), { maxWidth: 360 });
      marker.on("click", () => {
        try {
          STATE.map.setView([r.lat, r.lng], 13, { animate: true });
        } catch (e) {}
        try { marker.openPopup(); } catch (e) {}
      });
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
  async function getPesquisaIdBySlug(slug) {
    try {
      const s = (slug || "").trim();
      if (!s) return null;
      const supabase = window?.supabaseClient || null;
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("pesquisas")
        .select("id")
        .eq("slug", s)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[Mapa] Erro ao buscar pesquisa_id por slug:", error);
        return null;
      }
      return data?.id || null;
    } catch (e) {
      console.warn("[Mapa] Falha ao buscar pesquisa_id por slug:", e);
      return null;
    }
  }
  async function fetchRows(opts) {
    const supabase = window?.supabaseClient || null;

    const csvUrl = opts?.csvUrl || "";
    const apiUrl = opts?.apiUrl || "";
    const supabaseEnabled = !!opts?.supabaseEnabled;

    let pesquisaId = opts?.pesquisaId || null;
    const pesquisaSlug = opts?.pesquisaSlug || null;

    if (apiUrl) {
      try {
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) {
          console.warn("[Mapa] /api/pontos respondeu com erro:", res.status);
        } else {
          const payload = await res.json();
          if (payload && Array.isArray(payload.data)) {
            return payload.data;
          }
        }
      } catch (e) {
        console.warn("[Mapa] Falha ao buscar /api/pontos:", e);
      }
    }

    // 1) Supabase: resolve pesquisa_id pelo slug se necessário
    if (supabaseEnabled && supabase) {
      if (!pesquisaId && pesquisaSlug) {
        pesquisaId = await getPesquisaIdBySlug(pesquisaSlug);
      }

      if (pesquisaId) {
        console.log("[Mapa] Supabase: carregando pontos (pesquisa_id):", pesquisaId);

        const { data, error } = await supabase
          .from("pontos")
          .select("*")
          .eq("pesquisa_id", pesquisaId)
          .eq("ativo", true);

        if (error) {
          console.warn("[Mapa] Erro ao buscar pontos:", error);
        } else if (Array.isArray(data) && data.length > 0) {
          console.log("[Mapa] Pontos carregados:", data.length);

          return data;
        } else {
          console.warn("[Mapa] Supabase retornou 0 pontos ativos. Tentando CSV fallback (se existir).");
        }
      } else {
        console.warn("[Mapa] Sem pesquisaId e não consegui resolver por slug. Tentando CSV fallback (se existir).");
      }
    }

    // 2) CSV fallback
    if (csvUrl) {
      return await fetchCsv(csvUrl);
    }

    return [];
  }

  async function fetchCsv(url) {
    console.log("[Mapa] Carregando CSV:", url);
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

      const contato = pick(r, ["Contato", "contato", "Telefone", "telefone"]);
      const telefone = pick(r, ["Telefone", "telefone"]);
      const whatsapp = pick(r, ["WhatsApp", "whatsapp"]);
      const email = pick(r, ["Email", "email", "E-mail", "e-mail"]);
      const instagram = pick(r, ["Instagram", "instagram"]);
      const facebook = pick(r, ["Facebook", "facebook"]);
      const youtube = pick(r, ["Youtube", "youtube", "YouTube", "youTube"]);
      const linkedin = pick(r, ["Linkedin", "linkedin", "LinkedIn", "linkedIn"]);
      const tiktok = pick(r, ["TikTok", "Tiktok", "tiktok"]);
      const site = pick(r, ["Site", "site", "URL", "url"]);
      const link = pick(r, ["Link", "link"]);
      const descricao = pick(r, ["Descrição", "Descricao", "descricao"]);
      const observacao = pick(r, ["Observacao", "observacao", "Observação", "observação"]);

      return {
        _id: `row-${idx + 1}`,
        nome: String(nome || "").trim(),
        categoria: String(categoria || "").trim(),
        territorio: String(territorio || "").trim(),
        cidade: String(cidade || "").trim(),
        estado: String(estado || "").trim(),
        lat,
        lng,
        telefone: String(telefone || contato || "").trim(),
        contato: String(contato || "").trim(),
        whatsapp: String(whatsapp || "").trim(),
        email: String(email || "").trim(),
        instagram: String(instagram || "").trim(),
        facebook: String(facebook || "").trim(),
        youtube: String(youtube || "").trim(),
        linkedin: String(linkedin || "").trim(),
        tiktok: String(tiktok || "").trim(),
        site: String(site || "").trim(),
        link: String(link || "").trim(),
        descricao: String(descricao || "").trim(),
        observacao: String(observacao || "").trim(),
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
    parts.push(`<div style="font-family:Arial,sans-serif;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:12px;box-shadow:0 18px 34px rgba(15,61,46,.10)">`);
    parts.push(`<div style="font-weight:900;color:#0f3d2e;font-size:15px;line-height:1.2">${esc(r.nome || "")}</div>`);
    if (r.categoria) parts.push(`<div style="margin-top:6px;display:inline-block;padding:4px 8px;border-radius:999px;background:#f3efe9;color:#5a2a12;font-weight:800;font-size:12px">${esc(r.categoria)}</div>`);
    parts.push(`<div style="color:#555;margin-top:8px;font-size:12px">${esc(r.cidade || "")}/${esc(r.estado || "")}${r.territorio ? " • " + esc(r.territorio) : ""}</div>`);

    if (r.descricao) {
      parts.push(`<div style="margin-top:10px;color:#333;font-size:12px;line-height:1.5">${esc(r.descricao)}</div>`);
    }

    const contacts = [];
    const addContact = (icon, label, value, href, external = true) => {
      if (!value) return;
      const safeValue = esc(value);
      if (href) {
        const safeHref = esc(href);
        const target = external ? ` target="_blank" rel="noreferrer"` : "";
        contacts.push(`<div>${icon} <a href="${safeHref}"${target} style="color:#0f3d2e;font-weight:800;text-decoration:none">${safeValue}</a></div>`);
      } else {
        contacts.push(`<div>${icon} ${safeValue}</div>`);
      }
    };

    const telefoneValue = String(r.telefone || r.contato || "").trim();
    const telefoneDigits = digits(telefoneValue);
    if (telefoneValue) {
      addContact("📞", "Telefone", telefoneValue, telefoneDigits ? `tel:${telefoneDigits}` : "", false);
    }

    const whatsappValue = String(r.whatsapp || "").trim();
    addContact("💬", "WhatsApp", whatsappValue, asWaUrl(whatsappValue));

    const emailValue = String(r.email || "").trim();
    if (emailValue) {
      addContact("✉️", "E-mail", emailValue, `mailto:${emailValue}`, false);
    }

    const instagramValue = String(r.instagram || "").trim();
    addContact("📸", "Instagram", instagramValue, asIgUrl(instagramValue));

    const facebookValue = String(r.facebook || "").trim();
    addContact("📘", "Facebook", facebookValue, asUrl(facebookValue));

    const youtubeValue = String(r.youtube || "").trim();
    addContact("▶️", "YouTube", youtubeValue, asUrl(youtubeValue));

    const linkedinValue = String(r.linkedin || "").trim();
    addContact("💼", "LinkedIn", linkedinValue, asUrl(linkedinValue));

    const tiktokValue = String(r.tiktok || "").trim();
    addContact("🎵", "TikTok", tiktokValue, asTiktokUrl(tiktokValue));

    const siteValue = String(r.site || "").trim();
    addContact("🌐", "Site", siteValue, asUrl(siteValue));

    const linkValue = String(r.link || "").trim();
    addContact("🔗", "Link", linkValue, asUrl(linkValue));

    if (contacts.length) {
      parts.push(
        `<div style="margin-top:10px;border-top:1px solid rgba(0,0,0,.08);padding-top:8px">` +
          `<div style="font-weight:700;font-size:12px;margin-bottom:6px;color:#111">Contatos</div>` +
          `<div style="font-size:12px;line-height:1.6">${contacts.join("")}</div>` +
        `</div>`
      );
    }

    if (r.observacao) {
      parts.push(`<div style="margin-top:10px;color:#666;font-size:11px;line-height:1.4"><b>Obs:</b> ${esc(r.observacao)}</div>`);
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

  function asUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function asIgUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const handle = raw.replace(/^@/, "").trim();
    if (!handle) return "";
    return `https://instagram.com/${handle}`;
  }

  function asTiktokUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const handle = raw.replace(/^@/, "").trim();
    if (!handle) return "";
    return `https://www.tiktok.com/@${handle}`;
  }

  function asWaUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const onlyDigits = digits(raw);
    if (!onlyDigits) return "";
    return `https://wa.me/${onlyDigits}`;
  }
})();
