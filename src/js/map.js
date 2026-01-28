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
          ${contactRowCardHtml(r)}
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

      listEl.querySelectorAll(".contact-link").forEach(a => {
        a.addEventListener("click", (ev) => {
          ev.stopPropagation();
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

          return data.map((row) => ({
            Nome: row.nome,
            Categoria: row.categoria,
            Cidade: row.cidade,
            UF: row.uf,
            Latitude: row.lat,
            Longitude: row.lng,
            Descricao: row.descricao,
            Território: row.territorio || row.território || "",

            Site: row.site,
            Instagram: row.instagram,
            Facebook: row.facebook,
            WhatsApp: row.whatsapp,
            Email: row.email,
            YouTube: row.youtube,
            LinkedIn: row.linkedin,
            TikTok: row.tiktok,
            Telefone: row.telefone
          }));
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

      const telefone = pick(r, ["Telefone", "telefone", "Fone", "fone"]);
      const whatsapp = pick(r, ["WhatsApp", "whatsapp", "Whatsapp"]);
      const email = pick(r, ["Email", "email", "E-mail", "e-mail"]);
      const instagram = pick(r, ["Instagram", "instagram", "Insta", "insta"]);
      const facebook = pick(r, ["Facebook", "facebook", "Fb", "fb"]);
      const youtube = pick(r, ["YouTube", "Youtube", "youtube"]);
      const linkedin = pick(r, ["LinkedIn", "Linkedin", "linkedin"]);
      const tiktok = pick(r, ["TikTok", "Tiktok", "tiktok"]);
      const site = pick(r, ["Site", "site", "URL", "url", "Website", "website"]);
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
        telefone: String(telefone || "").trim(),
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

  function contactRowCardHtml(r) {
    const links = [];

    const push = (href, label, svg, { text = "", iconOnly = false } = {}) => {
      if (!href) return;
      links.push(`
        <a class="contact-link ${iconOnly ? "icon-only" : ""}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}" title="${esc(label)}">
          ${svg}
          ${text ? `<span class="label">${esc(text)}</span>` : ""}
        </a>
      `);
    };

    const pushTel = (value) => {
      const phone = sanitizePhone(value);
      if (!phone) return;
      const href = `tel:${phone}`;
      links.push(`
        <a class="contact-link" href="${esc(href)}" aria-label="Telefone" title="Telefone">
          ${ICON_PHONE}
          <span class="label">${esc(prettyPhone(value))}</span>
        </a>
      `);
    };

    const pushMail = (value) => {
      const v = String(value || "").trim();
      if (!v) return;
      const href = `mailto:${v}`;
      links.push(`
        <a class="contact-link" href="${esc(href)}" aria-label="Email" title="Email">
          ${ICON_MAIL}
          <span class="label">${esc(v)}</span>
        </a>
      `);
    };

    // Site (ícone + link)
    push(normalizeUrl(r.site), "Site", ICON_GLOBE, { iconOnly: true });

    // Instagram
    push(normalizeHandleUrl(r.instagram, "https://instagram.com/"), "Instagram", ICON_INSTAGRAM, { iconOnly: true });

    // Facebook
    push(normalizeFacebook(r.facebook), "Facebook", ICON_FACEBOOK, { iconOnly: true });

    // WhatsApp
    push(normalizeWhatsApp(r.whatsapp), "WhatsApp", ICON_WHATSAPP, { iconOnly: true });

    // Email (ícone + texto)
    pushMail(r.email);

    // YouTube (somente ícone)
    push(normalizeYoutube(r.youtube), "YouTube", ICON_YOUTUBE, { iconOnly: true });

    // LinkedIn (somente ícone)
    push(normalizeLinkedin(r.linkedin), "LinkedIn", ICON_LINKEDIN, { iconOnly: true });

    // TikTok (somente ícone)
    push(normalizeHandleUrl(r.tiktok, "https://www.tiktok.com/@"), "TikTok", ICON_TIKTOK, { iconOnly: true });

    // Telefone (ícone + número)
    pushTel(r.telefone);

    if (!links.length) return "";
    return `<div class="contact-row">${links.join("")}</div>`;
  }

  function sanitizePhone(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    const cleaned = s.replace(/[^\d+]/g, "");
    const digitsOnly = cleaned.replace(/[^\d]/g, "");
    if (!digitsOnly) return "";
    if (cleaned.startsWith("+")) return cleaned;
    if (digitsOnly.length >= 10 && digitsOnly.length <= 11) return `+55${digitsOnly}`;
    return `+${digitsOnly}`;
  }

  function prettyPhone(v) {
    return String(v || "").trim();
  }

  function normalizeUrl(v) {
    let s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    return `https://${s}`;
  }

  function normalizeHandleUrl(v, base) {
    let s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    s = s.replace(/^@+/, "");
    if (!s) return "";
    return `${base}${encodeURIComponent(s)}`;
  }

  function normalizeWhatsApp(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    const phone = sanitizePhone(s);
    const digits = phone.replace(/[^\d]/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}`;
  }

  function normalizeFacebook(v) {
    let s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    s = s.replace(/^facebook\.com\//i, "");
    return `https://facebook.com/${encodeURIComponent(s)}`;
  }

  function normalizeYoutube(v) {
    let s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    s = s.replace(/^@+/, "@");
    return s.startsWith("@")
      ? `https://www.youtube.com/${encodeURIComponent(s)}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}`;
  }

  function normalizeLinkedin(v) {
    let s = String(v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("in/") || s.startsWith("company/")) return `https://www.linkedin.com/${s}`;
    return `https://www.linkedin.com/in/${encodeURIComponent(s)}`;
  }

  /* SVG Icons */
  const ICON_GLOBE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M2 12h20"></path>
    <path d="M12 2a15 15 0 0 1 0 20"></path>
    <path d="M12 2a15 15 0 0 0 0 20"></path>
  </svg>`;

  const ICON_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.06a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z"></path>
  </svg>`;

  const ICON_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 4h16v16H4z"></path>
    <path d="m22 6-10 7L2 6"></path>
  </svg>`;

  const ICON_INSTAGRAM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
    <path d="M16 11.37a4 4 0 1 1-7.87 1.26A4 4 0 0 1 16 11.37z"></path>
    <path d="M17.5 6.5h.01"></path>
  </svg>`;

  const ICON_FACEBOOK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>`;

  const ICON_WHATSAPP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 11.5a8.5 8.5 0 1 1-15.4 4.6L3 21l4.9-2.5A8.5 8.5 0 0 1 21 11.5z"></path>
    <path d="M8.5 9.5c1.2 2.5 3.5 4.8 6 6l1.5-1a1 1 0 0 1 1.1 0l1.4.8a1 1 0 0 1 .4 1.3c-.4.8-1.3 1.4-2.2 1.5-1.6.1-4.8-.8-7.7-3.7S5.2 10 5.3 8.4c.1-.9.7-1.8 1.5-2.2a1 1 0 0 1 1.3.4l.8 1.4a1 1 0 0 1 0 1.1z"></path>
  </svg>`;

  const ICON_YOUTUBE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22.5 7.5s-.2-1.5-.8-2.2c-.8-.9-1.7-.9-2.1-1C16.8 4 12 4 12 4h0s-4.8 0-7.6.3c-.4.1-1.3.1-2.1 1C1.7 6 1.5 7.5 1.5 7.5S1.2 9.3 1.2 11v2c0 1.7.3 3.5.3 3.5s.2 1.5.8 2.2c.8.9 1.9.9 2.4 1C7.2 20 12 20 12 20s4.8 0 7.6-.3c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.2.8-2.2s.3-1.8.3-3.5v-2c0-1.7-.3-3.5-.3-3.5z"></path>
    <path d="M10 9l6 3-6 3V9z"></path>
  </svg>`;

  const ICON_LINKEDIN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v2a4 4 0 0 1 2-3z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>`;

  const ICON_TIKTOK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47"></path>
    <path d="M14 7c1.5 2 3.5 3 6 3"></path>
  </svg>`;

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
