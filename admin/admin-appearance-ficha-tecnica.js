const PATH = ["pesquisa", "ficha_tecnica"];

function deepGet(obj, path){
  return path.reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, obj);
}

function deepSet(obj, path, value){
  let o = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const k = path[i];
    if (!o[k] || typeof o[k] !== "object") o[k] = {};
    o = o[k];
  }
  o[path[path.length - 1]] = value;
  return obj;
}

function ensurePreviewStyle(){
  let style = document.getElementById("adminFTAppearancePreview");
  if (!style) {
    style = document.createElement("style");
    style.id = "adminFTAppearancePreview";
    document.head.appendChild(style);
  }
  return style;
}

function buildFTVars(ft, customCss){
  const s = ft.section || {};
  const t = ft.titles || {};
  const l = ft.logos || {};
  const tt = ft.teamText || {};
  const c = ft.cards || {};
  const b = ft.linkBtn || {};
  const m = ft.mobile || {};

  return `
.page-ficha-tecnica{
  --ft-section-bg:${s.bg || "#fff"};
  --ft-section-radius:${(s.radius ?? 10)}px;
  --ft-section-shadow:${s.shadow || "0 4px 15px rgba(0,0,0,0.05)"};
  --ft-section-maxw:${(s.maxWidth ?? 1100)}px;
  --ft-section-pad-y:${(s.padY ?? 44)}px;
  --ft-section-pad-x:${(s.padX ?? 22)}px;
  --ft-section-gap:${(s.gap ?? 18)}px;

  --ft-h2-color:${t.h2Color || "#0f3d2e"};
  --ft-h2-size:${(t.h2Size ?? 20)}px;
  --ft-h2-weight:${(t.h2Weight ?? 800)};
  --ft-h2-border:${t.h2BorderColor || "#eee"};
  --ft-logo-h3-color:${t.logoH3Color || "#0f3d2e"};
  --ft-logo-h3-size:${(t.logoH3Size ?? 14)}px;
  --ft-logo-h3-weight:${(t.logoH3Weight ?? 800)};

  --ft-logos-gap:${(l.gridGap ?? 40)}px;
  --ft-logo-box-pad:${(l.boxPad ?? 18)}px;
  --ft-logo-img-maxw:${(l.imgMaxWidth ?? 240)}px;

  --ft-team-color:${tt.color || "#2f2f2f"};
  --ft-team-font:${(tt.fontSize ?? 14)}px;
  --ft-team-lh:${(tt.lineHeight ?? 1.55)};

  --ft-card-bg:${c.bg || "#0f3d2e"};
  --ft-card-radius:${(c.radius ?? 12)}px;
  --ft-card-shadow:${c.shadow || "0 4px 15px rgba(0,0,0,0.12)"};
  --ft-name-color:${c.nameColor || "#fff"};
  --ft-name-size:${(c.nameSize ?? 16)}px;
  --ft-name-weight:${(c.nameWeight ?? 800)};
  --ft-role-color:${c.roleColor || "#ffdd9a"};
  --ft-role-size:${(c.roleSize ?? 13)}px;
  --ft-role-weight:${(c.roleWeight ?? 700)};
  --ft-hover-lift:${(c.hoverLift ?? 6)}px;
  --ft-hover-shadow:${c.hoverShadow || "0 10px 25px rgba(0,0,0,0.25)"};
  --ft-photo-size:${(c.photoSize ?? 120)}px;
  --ft-photo-radius:${(c.photoRadius ?? 999)}px;
  --ft-photo-border:${c.photoBorder || "3px solid rgba(255,255,255,0.25)"};

  --ft-link-bg:${b.bg || "rgba(0,0,0,0.06)"};
  --ft-link-border:${b.border || "1px solid rgba(0,0,0,0.10)"};
  --ft-link-color:${b.color || "#111"};
  --ft-link-radius:${(b.radius ?? 999)}px;
  --ft-link-pad-y:${(b.padY ?? 8)}px;
  --ft-link-pad-x:${(b.padX ?? 12)}px;
  --ft-link-font:${(b.fontSize ?? 13)}px;
  --ft-link-weight:${(b.fontWeight ?? 800)};
  --ft-link-hover-bg:${b.hoverBg || "rgba(0,0,0,0.10)"};

  --ft-m-pad-x:${(m.sectionPadX ?? 16)}px;
  --ft-m-pad-y:${(m.sectionPadY ?? 30)}px;
  --ft-m-h2-size:${(m.h2Size ?? 18)}px;
  --ft-m-logo-img-maxw:${(m.logoImgMaxWidth ?? 200)}px;
  --ft-m-photo-size:${(m.photoSize ?? 96)}px;
}
${customCss || ""}`.trim();
}

export async function renderAppearanceFichaTecnica(container){
  container.innerHTML = `
  <div class="adm-card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div>
        <h2>Aparência → Ficha Técnica</h2>
        <p class="muted">Configuração específica da página Ficha Técnica. Não afeta outras abas.</p>
      </div>
      <div class="adm-actions">
        <button class="btn primary" id="ft_save">Salvar</button>
        <button class="btn light" id="ft_reload">Recarregar</button>
        <span id="ft_msg" class="muted"></span>
      </div>
    </div>

    <div class="adm-subtabs" id="ft_subtabs">
      ${["Seção", "Títulos", "Logos", "Texto", "Cards", "Botão Link", "CSS Extra"].map((t, i) => `
        <button class="adm-subtab ${i === 0 ? "active" : ""}" data-tab="${i}">${t}</button>
      `).join("")}
    </div>

    <div class="adm-subview" id="ft_view"></div>
  </div>
  `;

  const msg = container.querySelector("#ft_msg");
  const view = container.querySelector("#ft_view");

  const supabase = await window.getSupabaseClient?.();
  if (!supabase) {
    msg.textContent = "Supabase não configurado. Verifique js/supabase-config.js.";
    return;
  }

  const loadRow = async () => {
    const { data, error } = await supabase
      .from("site_config")
      .select("appearance_json, custom_css")
      .eq("config_key", "main")
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  let row;
  try {
    row = await loadRow();
  } catch (e) {
    msg.textContent = `Erro ao carregar: ${e.message}`;
    return;
  }

  let appearance = row?.appearance_json || {};
  let customCss = row?.custom_css || "";

  let ft = deepGet(appearance, PATH) || {};
  if (!ft || typeof ft !== "object") ft = {};

  const preview = () => {
    const style = ensurePreviewStyle();
    style.textContent = buildFTVars(ft, customCss);
  };

  const renderTab = (idx) => {
    if (idx === 0) {
      const s = ft.section || {};
      view.innerHTML = `
        <h3>Seção (caixa branca)</h3>
        <div class="adm-grid">
          <label class="adm-field"><span>Background</span><input type="color" id="s_bg" value="${s.bg || "#ffffff"}"></label>
          <label class="adm-field"><span>Radius</span><input type="number" id="s_radius" value="${s.radius ?? 10}" min="0" max="30"></label>
          <label class="adm-field"><span>Max Width</span><input type="number" id="s_maxw" value="${s.maxWidth ?? 1100}" min="700" max="1600"></label>
          <label class="adm-field"><span>Padding Y</span><input type="number" id="s_pady" value="${s.padY ?? 44}" min="0" max="100"></label>
          <label class="adm-field"><span>Padding X</span><input type="number" id="s_padx" value="${s.padX ?? 22}" min="0" max="80"></label>
          <label class="adm-field"><span>Gap entre seções</span><input type="number" id="s_gap" value="${s.gap ?? 18}" min="0" max="60"></label>
          <label class="adm-field" style="grid-column:1/-1;"><span>Shadow (CSS)</span><input type="text" id="s_shadow" value="${s.shadow || "0 4px 15px rgba(0,0,0,0.05)"}"></label>
        </div>
      `;
      const bind = () => {
        ft.section = {
          bg: view.querySelector("#s_bg").value,
          radius: Number(view.querySelector("#s_radius").value),
          maxWidth: Number(view.querySelector("#s_maxw").value),
          padY: Number(view.querySelector("#s_pady").value),
          padX: Number(view.querySelector("#s_padx").value),
          gap: Number(view.querySelector("#s_gap").value),
          shadow: view.querySelector("#s_shadow").value
        };
        preview();
      };
      view.querySelectorAll("input").forEach((i) => i.addEventListener("input", bind));
      return;
    }

    if (idx === 1) {
      const t = ft.titles || {};
      view.innerHTML = `
        <h3>Títulos</h3>
        <div class="adm-grid">
          <label class="adm-field"><span>H2 cor</span><input type="color" id="t_h2c" value="${t.h2Color || "#0f3d2e"}"></label>
          <label class="adm-field"><span>H2 tamanho</span><input type="number" id="t_h2s" value="${t.h2Size ?? 20}" min="12" max="40"></label>
          <label class="adm-field"><span>H2 peso</span><input type="number" id="t_h2w" value="${t.h2Weight ?? 800}" min="100" max="900" step="100"></label>
          <label class="adm-field"><span>H2 borda</span><input type="color" id="t_h2b" value="${t.h2BorderColor || "#eeeeee"}"></label>

          <label class="adm-field"><span>Logo H3 cor</span><input type="color" id="t_lc" value="${t.logoH3Color || "#0f3d2e"}"></label>
          <label class="adm-field"><span>Logo H3 tamanho</span><input type="number" id="t_ls" value="${t.logoH3Size ?? 14}" min="10" max="28"></label>
          <label class="adm-field"><span>Logo H3 peso</span><input type="number" id="t_lw" value="${t.logoH3Weight ?? 800}" min="100" max="900" step="100"></label>
        </div>
      `;
      const bind = () => {
        ft.titles = {
          h2Color: view.querySelector("#t_h2c").value,
          h2Size: Number(view.querySelector("#t_h2s").value),
          h2Weight: Number(view.querySelector("#t_h2w").value),
          h2BorderColor: view.querySelector("#t_h2b").value,
          logoH3Color: view.querySelector("#t_lc").value,
          logoH3Size: Number(view.querySelector("#t_ls").value),
          logoH3Weight: Number(view.querySelector("#t_lw").value)
        };
        preview();
      };
      view.querySelectorAll("input").forEach((i) => i.addEventListener("input", bind));
      return;
    }

    if (idx === 2) {
      const l = ft.logos || {};
      view.innerHTML = `
        <h3>Logos</h3>
        <div class="adm-grid">
          <label class="adm-field"><span>Gap do grid</span><input type="number" id="l_gap" value="${l.gridGap ?? 40}" min="0" max="100"></label>
          <label class="adm-field"><span>Padding da caixa</span><input type="number" id="l_pad" value="${l.boxPad ?? 18}" min="0" max="60"></label>
          <label class="adm-field"><span>Max width logo</span><input type="number" id="l_mw" value="${l.imgMaxWidth ?? 240}" min="80" max="600"></label>
        </div>
      `;
      const bind = () => {
        ft.logos = {
          gridGap: Number(view.querySelector("#l_gap").value),
          boxPad: Number(view.querySelector("#l_pad").value),
          imgMaxWidth: Number(view.querySelector("#l_mw").value)
        };
        preview();
      };
      view.querySelectorAll("input").forEach((i) => i.addEventListener("input", bind));
      return;
    }

    if (idx === 3) {
      const tt = ft.teamText || {};
      view.innerHTML = `
        <h3>Texto da Equipe</h3>
        <div class="adm-grid">
          <label class="adm-field"><span>Cor</span><input type="color" id="tt_c" value="${tt.color || "#2f2f2f"}"></label>
          <label class="adm-field"><span>Tamanho</span><input type="number" id="tt_s" value="${tt.fontSize ?? 14}" min="10" max="22"></label>
          <label class="adm-field"><span>Line-height</span><input type="number" id="tt_lh" value="${tt.lineHeight ?? 1.55}" min="1" max="2" step="0.05"></label>
        </div>
      `;
      const bind = () => {
        ft.teamText = {
          color: view.querySelector("#tt_c").value,
          fontSize: Number(view.querySelector("#tt_s").value),
          lineHeight: Number(view.querySelector("#tt_lh").value)
        };
        preview();
      };
      view.querySelectorAll("input").forEach((i) => i.addEventListener("input", bind));
      return;
    }

    if (idx === 4) {
      const c = ft.cards || {};
      view.innerHTML = `
        <h3>Cards (Integrantes)</h3>
        <div class="adm-grid">
          <label class="adm-field"><span>BG Card</span><input type="color" id="c_bg" value="${c.bg || "#0f3d2e"}"></label>
          <label class="adm-field"><span>Radius</span><input type="number" id="c_r" value="${c.radius ?? 12}" min="0" max="30"></label>
          <label class="adm-field"><span>Shadow (CSS)</span><input type="text" id="c_sh" value="${c.shadow || "0 4px 15px rgba(0,0,0,0.12)"}"></label>

          <label class="adm-field"><span>Nome cor</span><input type="color" id="c_nc" value="${c.nameColor || "#ffffff"}"></label>
          <label class="adm-field"><span>Nome tamanho</span><input type="number" id="c_ns" value="${c.nameSize ?? 16}" min="10" max="26"></label>
          <label class="adm-field"><span>Nome peso</span><input type="number" id="c_nw" value="${c.nameWeight ?? 800}" min="100" max="900" step="100"></label>

          <label class="adm-field"><span>Cargo cor</span><input type="color" id="c_rc" value="${c.roleColor || "#ffdd9a"}"></label>
          <label class="adm-field"><span>Cargo tamanho</span><input type="number" id="c_rs" value="${c.roleSize ?? 13}" min="10" max="22"></label>
          <label class="adm-field"><span>Cargo peso</span><input type="number" id="c_rw" value="${c.roleWeight ?? 700}" min="100" max="900" step="100"></label>

          <label class="adm-field"><span>Hover lift</span><input type="number" id="c_hl" value="${c.hoverLift ?? 6}" min="0" max="20"></label>
          <label class="adm-field"><span>Hover shadow (CSS)</span><input type="text" id="c_hs" value="${c.hoverShadow || "0 10px 25px rgba(0,0,0,0.25)"}"></label>

          <label class="adm-field"><span>Foto size</span><input type="number" id="c_ps" value="${c.photoSize ?? 120}" min="50" max="200"></label>
          <label class="adm-field"><span>Foto radius</span><input type="number" id="c_pr" value="${c.photoRadius ?? 999}" min="0" max="999"></label>
          <label class="adm-field" style="grid-column:1/-1;"><span>Foto border (CSS)</span><input type="text" id="c_pb" value="${c.photoBorder || "3px solid rgba(255,255,255,0.25)"}"></label>
        </div>
      `;
      const bind = () => {
        ft.cards = {
          bg: view.querySelector("#c_bg").value,
          radius: Number(view.querySelector("#c_r").value),
          shadow: view.querySelector("#c_sh").value,
          nameColor: view.querySelector("#c_nc").value,
          nameSize: Number(view.querySelector("#c_ns").value),
          nameWeight: Number(view.querySelector("#c_nw").value),
          roleColor: view.querySelector("#c_rc").value,
          roleSize: Number(view.querySelector("#c_rs").value),
          roleWeight: Number(view.querySelector("#c_rw").value),
          hoverLift: Number(view.querySelector("#c_hl").value),
          hoverShadow: view.querySelector("#c_hs").value,
          photoSize: Number(view.querySelector("#c_ps").value),
          photoRadius: Number(view.querySelector("#c_pr").value),
          photoBorder: view.querySelector("#c_pb").value
        };
        preview();
      };
      view.querySelectorAll("input").forEach((i) => i.addEventListener("input", bind));
      return;
    }

    if (idx === 5) {
      const b = ft.linkBtn || {};
      const bgHex = b.bgHex || "#ffffff";
      const bgAlpha = b.bgAlpha ?? 12;
      const borderHex = b.borderHex || "#ffffff";
      const borderAlpha = b.borderAlpha ?? 20;
      const borderW = b.borderW ?? 1;
      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>Botão Link</h3>
              <p class="ui-muted">Ajuste o estilo do botão “Link” nos cards da Ficha Técnica.</p>
            </div>

            <div class="ui-preview">
              <a class="ft-person-linkbtn" href="javascript:void(0)">Ver link</a>
            </div>
          </div>

          <div class="ui-grid">
            <div class="ui-control">
              <label>Texto</label>
              <div class="ui-row">
                <input type="color" id="b_text_hex" value="${b.color || "#111111"}">
                <input type="text" id="b_text_hex_txt" value="${b.color || "#111111"}" placeholder="#FFFFFF">
              </div>
            </div>

            <div class="ui-control">
              <label>Fundo</label>
              <div class="ui-row">
                <input type="color" id="b_bg_hex" value="${bgHex}">
                <input type="text" id="b_bg_hex_txt" value="${bgHex}" placeholder="#FFFFFF">
              </div>
              <div class="ui-row">
                <span class="ui-mini">Opacidade</span>
                <input type="range" id="b_bg_a" min="0" max="100" value="${bgAlpha}">
                <span class="ui-mini" id="b_bg_a_val">${bgAlpha}%</span>
              </div>
            </div>

            <div class="ui-control">
              <label>Borda</label>
              <div class="ui-row">
                <span class="ui-mini">Espessura</span>
                <input type="range" id="b_bw" min="0" max="6" value="${borderW}">
                <span class="ui-mini" id="b_bw_val">${borderW}px</span>
              </div>
              <div class="ui-row">
                <input type="color" id="b_bd_hex" value="${borderHex}">
                <input type="text" id="b_bd_hex_txt" value="${borderHex}" placeholder="#FFFFFF">
              </div>
              <div class="ui-row">
                <span class="ui-mini">Opacidade</span>
                <input type="range" id="b_bd_a" min="0" max="100" value="${borderAlpha}">
                <span class="ui-mini" id="b_bd_a_val">${borderAlpha}%</span>
              </div>
            </div>

            <div class="ui-control">
              <label>Formato e tipografia</label>
              <div class="ui-row">
                <span class="ui-mini">Radius</span>
                <input type="range" id="b_r" min="0" max="999" value="${b.radius ?? 999}">
                <span class="ui-mini" id="b_r_val">${b.radius ?? 999}</span>
              </div>

              <div class="ui-row">
                <span class="ui-mini">Tamanho</span>
                <input type="range" id="b_fs" min="10" max="20" value="${b.fontSize ?? 13}">
                <span class="ui-mini" id="b_fs_val">${b.fontSize ?? 13}px</span>
              </div>

              <div class="ui-row">
                <span class="ui-mini">Peso</span>
                <input type="range" id="b_fw" min="300" max="900" step="100" value="${b.fontWeight ?? 800}">
                <span class="ui-mini" id="b_fw_val">${b.fontWeight ?? 800}</span>
              </div>

              <div class="ui-row">
                <span class="ui-mini">Padding Y</span>
                <input type="range" id="b_py" min="0" max="18" value="${b.padY ?? 8}">
                <span class="ui-mini" id="b_py_val">${b.padY ?? 8}px</span>
              </div>

              <div class="ui-row">
                <span class="ui-mini">Padding X</span>
                <input type="range" id="b_px" min="0" max="28" value="${b.padX ?? 12}">
                <span class="ui-mini" id="b_px_val">${b.padX ?? 12}px</span>
              </div>
            </div>

            <div class="ui-control ui-full">
              <label>Preset rápido</label>
              <div class="ui-presets">
                <button class="ui-preset" data-preset="inst">Institucional (verde)</button>
                <button class="ui-preset" data-preset="brown">Marrom + branco</button>
                <button class="ui-preset" data-preset="dark">Dark elegante</button>
                <button class="ui-preset" data-preset="clean">Clean</button>
              </div>
            </div>
          </div>
        </div>
      `;

      const clampHex = (value, fallback) => {
        const trimmed = (value || "").trim();
        return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
      };

      const hexToRgba = (hex, alphaPct) => {
        const cleaned = hex.replace("#", "");
        const r = Number.parseInt(cleaned.slice(0, 2), 16);
        const g = Number.parseInt(cleaned.slice(2, 4), 16);
        const b = Number.parseInt(cleaned.slice(4, 6), 16);
        const alpha = Math.max(0, Math.min(100, Number(alphaPct))) / 100;
        return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      };

      const sync = () => {
        const textHex = clampHex(
          view.querySelector("#b_text_hex_txt").value,
          view.querySelector("#b_text_hex").value
        );
        view.querySelector("#b_text_hex").value = textHex;
        view.querySelector("#b_text_hex_txt").value = textHex;

        const bgHexValue = clampHex(
          view.querySelector("#b_bg_hex_txt").value,
          view.querySelector("#b_bg_hex").value
        );
        view.querySelector("#b_bg_hex").value = bgHexValue;
        view.querySelector("#b_bg_hex_txt").value = bgHexValue;

        const borderHexValue = clampHex(
          view.querySelector("#b_bd_hex_txt").value,
          view.querySelector("#b_bd_hex").value
        );
        view.querySelector("#b_bd_hex").value = borderHexValue;
        view.querySelector("#b_bd_hex_txt").value = borderHexValue;

        const bgA = Number(view.querySelector("#b_bg_a").value);
        const bdA = Number(view.querySelector("#b_bd_a").value);
        const bw = Number(view.querySelector("#b_bw").value);

        const r = Number(view.querySelector("#b_r").value);
        const fs = Number(view.querySelector("#b_fs").value);
        const fw = Number(view.querySelector("#b_fw").value);
        const py = Number(view.querySelector("#b_py").value);
        const px = Number(view.querySelector("#b_px").value);

        view.querySelector("#b_bg_a_val").textContent = `${bgA}%`;
        view.querySelector("#b_bd_a_val").textContent = `${bdA}%`;
        view.querySelector("#b_bw_val").textContent = `${bw}px`;
        view.querySelector("#b_r_val").textContent = `${r}`;
        view.querySelector("#b_fs_val").textContent = `${fs}px`;
        view.querySelector("#b_fw_val").textContent = `${fw}`;
        view.querySelector("#b_py_val").textContent = `${py}px`;
        view.querySelector("#b_px_val").textContent = `${px}px`;

        ft.linkBtn = {
          bgHex: bgHexValue,
          bgAlpha: bgA,
          borderHex: borderHexValue,
          borderAlpha: bdA,
          borderW: bw,
          color: textHex,
          radius: r,
          fontSize: fs,
          fontWeight: fw,
          padY: py,
          padX: px,
          bg: hexToRgba(bgHexValue, bgA),
          border: `${bw}px solid ${hexToRgba(borderHexValue, bdA)}`,
          hoverBg: hexToRgba(bgHexValue, Math.min(bgA + 8, 100))
        };

        preview();
      };

      view.querySelectorAll(".ui-preset").forEach((btn) => {
        btn.addEventListener("click", () => {
          const preset = btn.dataset.preset;
          if (preset === "inst") {
            view.querySelector("#b_bg_hex").value = "#0f3d2e";
            view.querySelector("#b_bg_hex_txt").value = "#0f3d2e";
            view.querySelector("#b_bg_a").value = 12;
            view.querySelector("#b_text_hex").value = "#0f3d2e";
            view.querySelector("#b_text_hex_txt").value = "#0f3d2e";
            view.querySelector("#b_bd_hex").value = "#0f3d2e";
            view.querySelector("#b_bd_hex_txt").value = "#0f3d2e";
            view.querySelector("#b_bd_a").value = 25;
            view.querySelector("#b_bw").value = 1;
          }
          if (preset === "brown") {
            view.querySelector("#b_bg_hex").value = "#5a2a12";
            view.querySelector("#b_bg_hex_txt").value = "#5a2a12";
            view.querySelector("#b_bg_a").value = 14;
            view.querySelector("#b_text_hex").value = "#ffffff";
            view.querySelector("#b_text_hex_txt").value = "#ffffff";
            view.querySelector("#b_bd_hex").value = "#ffffff";
            view.querySelector("#b_bd_hex_txt").value = "#ffffff";
            view.querySelector("#b_bd_a").value = 18;
            view.querySelector("#b_bw").value = 1;
          }
          if (preset === "dark") {
            view.querySelector("#b_bg_hex").value = "#000000";
            view.querySelector("#b_bg_hex_txt").value = "#000000";
            view.querySelector("#b_bg_a").value = 16;
            view.querySelector("#b_text_hex").value = "#ffffff";
            view.querySelector("#b_text_hex_txt").value = "#ffffff";
            view.querySelector("#b_bd_hex").value = "#ffffff";
            view.querySelector("#b_bd_hex_txt").value = "#ffffff";
            view.querySelector("#b_bd_a").value = 18;
            view.querySelector("#b_bw").value = 1;
          }
          if (preset === "clean") {
            view.querySelector("#b_bg_hex").value = "#ffffff";
            view.querySelector("#b_bg_hex_txt").value = "#ffffff";
            view.querySelector("#b_bg_a").value = 0;
            view.querySelector("#b_text_hex").value = "#111111";
            view.querySelector("#b_text_hex_txt").value = "#111111";
            view.querySelector("#b_bd_hex").value = "#111111";
            view.querySelector("#b_bd_hex_txt").value = "#111111";
            view.querySelector("#b_bd_a").value = 12;
            view.querySelector("#b_bw").value = 1;
          }
          sync();
        });
      });

      view.querySelectorAll("input").forEach((el) => el.addEventListener("input", sync));
      view.querySelectorAll('input[type="text"]').forEach((el) => el.addEventListener("change", sync));

      sync();
      return;
    }

    if (idx === 6) {
      view.innerHTML = `
        <h3>CSS Extra (só Ficha Técnica)</h3>
        <textarea id="ft_custom_css" rows="12" style="width:100%;" placeholder="CSS extra (opcional)">${customCss || ""}</textarea>
        <p class="muted" style="margin-top:8px">Dica: prefira usar os campos acima. Use CSS extra só para casos especiais.</p>
      `;
      const ta = view.querySelector("#ft_custom_css");
      ta.addEventListener("input", () => {
        customCss = ta.value;
        preview();
      });
    }
  };

  container.querySelector("#ft_subtabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".adm-subtab");
    if (!btn) return;
    container.querySelectorAll(".adm-subtab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderTab(Number(btn.dataset.tab));
  });

  container.querySelector("#ft_reload").addEventListener("click", async () => {
    msg.textContent = "Recarregando...";
    try {
      row = await loadRow();
      appearance = row?.appearance_json || {};
      customCss = row?.custom_css || "";
      ft = deepGet(appearance, PATH) || {};
      renderTab(0);
      preview();
      msg.textContent = "Recarregado ✅";
    } catch (e) {
      msg.textContent = `Erro: ${e.message}`;
    }
  });

  container.querySelector("#ft_save").addEventListener("click", async () => {
    msg.textContent = "Salvando...";
    const nextAppearance = JSON.parse(JSON.stringify(appearance || {}));
    deepSet(nextAppearance, PATH, ft);

    const { error } = await supabase
      .from("site_config")
      .update({ appearance_json: nextAppearance, custom_css: customCss })
      .eq("config_key", "main");

    msg.textContent = error ? `Erro ao salvar: ${error.message}` : "✅ Salvo com sucesso!";
  });

  renderTab(0);
  preview();
}
