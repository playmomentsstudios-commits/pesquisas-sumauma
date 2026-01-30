// src/js/admin-appearance-ficha-tecnica.js
import { supabase } from './supabase-client.js';

/**
 * Aparência → Ficha Técnica (Designer Panel)
 * - Sub-abas modernas
 * - Paleta de cores + custom
 * - Font picker + preview
 * - Sliders + preview em tempo real
 * - Salva em site_config onde config_key='main'
 */

// onde gravamos no JSON:
const PATH = ['pesquisa', 'ficha_tecnica'];

// Paleta padrão (pode ajustar)
const COLOR_PALETTE = [
  { name: 'Verde', value: '#0f3d2e' },
  { name: 'Marrom', value: '#5a2a12' },
  { name: 'Dourado', value: '#ffdd9a' },
  { name: 'Branco', value: '#ffffff' },
  { name: 'Preto', value: '#111111' },
  { name: 'Cinza', value: '#6b7280' },
  { name: 'Linha', value: '#eeeeee' },
];

// Fontes (você pode limitar só às que já usa)
const FONT_OPTIONS = [
  { label: 'Padrão do sistema', value: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' },
  { label: 'Inter', value: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' },
  { label: 'Montserrat', value: '"Montserrat", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' },
  { label: 'Merriweather', value: '"Merriweather", Georgia, serif' },
];

// ---------- utils ----------
function clampHex(v, fallback = '#ffffff') {
  const s = (v || '').trim();
  return /^#([0-9a-fA-F]{6})$/.test(s) ? s : fallback;
}
function deepGet(obj, path) {
  return path.reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}
function deepSet(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (!o[k] || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  o[path[path.length - 1]] = value;
  return obj;
}
function ensureStyle(id) {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }
  return style;
}
function hexToRgba(hex, alphaPct) {
  const h = clampHex(hex, '#ffffff').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(100, Number(alphaPct))) / 100;
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

// ---------- UI components ----------
function renderColorGrid(id, current) {
  const cur = clampHex(current, '#0f3d2e');
  return `
    <div class="ui-colorgrid" data-colorgrid="${id}">
      <div class="ui-swatchrow">
        ${COLOR_PALETTE.map(
          (c) => `
          <button class="ui-swatch ${c.value.toLowerCase() === cur.toLowerCase() ? 'active' : ''}"
                  type="button"
                  title="${c.name} ${c.value}"
                  data-value="${c.value}"
                  style="background:${c.value}">
          </button>
        `
        ).join('')}
      </div>

      <div class="ui-custom">
        <input type="color" id="${id}_picker" value="${cur}">
        <input type="text" id="${id}_hex" value="${cur}" placeholder="#FFFFFF">
      </div>
    </div>
  `;
}

function bindColorGrid(root, id, onChange) {
  const grid = root.querySelector(`[data-colorgrid="${id}"]`);
  const picker = root.querySelector(`#${id}_picker`);
  const hex = root.querySelector(`#${id}_hex`);
  if (!grid || !picker || !hex) return;

  const set = (val) => {
    const v = clampHex(val, picker.value);
    picker.value = v;
    hex.value = v;
    grid.querySelectorAll('.ui-swatch').forEach((b) => {
      b.classList.toggle('active', b.dataset.value.toLowerCase() === v.toLowerCase());
    });
    onChange(v);
  };

  grid.querySelectorAll('.ui-swatch').forEach((b) => b.addEventListener('click', () => set(b.dataset.value)));
  picker.addEventListener('input', () => set(picker.value));
  hex.addEventListener('change', () => set(hex.value));
}

function renderFontSelect(id, current) {
  const cur = current || FONT_OPTIONS[0].value;
  return `
    <select id="${id}" class="ui-select">
      ${FONT_OPTIONS.map(
        (f) => `<option value="${f.value}" ${f.value === cur ? 'selected' : ''}>${f.label}</option>`
      ).join('')}
    </select>
    <div class="ui-fontpreview" style="font-family:${cur}">
      Preview da fonte — Instituto Sumaúma
    </div>
  `;
}

// ---------- Preview CSS builder (usa as mesmas vars do front) ----------
function buildFTVars(ft, customCss) {
  const s = ft.section || {};
  const t = ft.titles || {};
  const tt = ft.teamText || {};
  const l = ft.logos || {};
  const c = ft.cards || {};
  const b = ft.linkBtn || {};
  const m = ft.mobile || {};

  // fontes (novas)
  const h2Font = t.h2Font || FONT_OPTIONS[0].value;
  const h3Font = t.logoH3Font || FONT_OPTIONS[0].value;
  const bodyFont = tt.font || FONT_OPTIONS[0].value;

  // Botão Link (amigável + compat)
  const bgHex = b.bgHex || '#ffffff';
  const bgAlpha = b.bgAlpha ?? 12;
  const bdHex = b.borderHex || '#ffffff';
  const bdAlpha = b.borderAlpha ?? 20;
  const bw = b.borderW ?? 1;

  // garante compatibilidade (front atual lê bg/border/hoverBg)
  const btnBg = b.bg || hexToRgba(bgHex, bgAlpha);
  const btnBorder = b.border || `${bw}px solid ${hexToRgba(bdHex, bdAlpha)}`;
  const btnHover = b.hoverBg || hexToRgba(bgHex, Math.min(bgAlpha + 8, 100));

  return `
/* ===== PREVIEW FICHA TÉCNICA (ADMIN) ===== */
.page-ficha-tecnica{
  --ft-section-bg:${s.bg || '#ffffff'};
  --ft-section-radius:${(s.radius ?? 10)}px;
  --ft-section-shadow:${s.shadow || '0 4px 15px rgba(0,0,0,0.05)'};
  --ft-section-maxw:${(s.maxWidth ?? 1100)}px;
  --ft-section-pad-y:${(s.padY ?? 44)}px;
  --ft-section-pad-x:${(s.padX ?? 22)}px;
  --ft-section-gap:${(s.gap ?? 18)}px;

  --ft-h2-color:${t.h2Color || '#0f3d2e'};
  --ft-h2-size:${(t.h2Size ?? 20)}px;
  --ft-h2-weight:${(t.h2Weight ?? 800)};
  --ft-h2-border:${t.h2BorderColor || '#eeeeee'};

  --ft-logo-h3-color:${t.logoH3Color || '#0f3d2e'};
  --ft-logo-h3-size:${(t.logoH3Size ?? 14)}px;
  --ft-logo-h3-weight:${(t.logoH3Weight ?? 800)};

  --ft-team-color:${tt.color || '#2f2f2f'};
  --ft-team-font:${(tt.fontSize ?? 14)}px;
  --ft-team-lh:${(tt.lineHeight ?? 1.55)};

  --ft-logos-gap:${(l.gridGap ?? 40)}px;
  --ft-logo-box-pad:${(l.boxPad ?? 18)}px;
  --ft-logo-img-maxw:${(l.imgMaxWidth ?? 240)}px;

  --ft-card-bg:${c.bg || '#0f3d2e'};
  --ft-card-radius:${(c.radius ?? 12)}px;
  --ft-card-shadow:${c.shadow || '0 4px 15px rgba(0,0,0,0.12)'};
  --ft-name-color:${c.nameColor || '#ffffff'};
  --ft-name-size:${(c.nameSize ?? 16)}px;
  --ft-name-weight:${(c.nameWeight ?? 800)};
  --ft-role-color:${c.roleColor || '#ffdd9a'};
  --ft-role-size:${(c.roleSize ?? 13)}px;
  --ft-role-weight:${(c.roleWeight ?? 700)};
  --ft-hover-lift:${(c.hoverLift ?? 6)}px;
  --ft-hover-shadow:${c.hoverShadow || '0 10px 25px rgba(0,0,0,0.25)'};
  --ft-photo-size:${(c.photoSize ?? 120)}px;
  --ft-photo-radius:${(c.photoRadius ?? 999)}px;
  --ft-photo-border:${c.photoBorder || '3px solid rgba(255,255,255,0.25)'};

  --ft-link-bg:${btnBg};
  --ft-link-border:${btnBorder};
  --ft-link-color:${b.color || '#111111'};
  --ft-link-radius:${(b.radius ?? 999)}px;
  --ft-link-pad-y:${(b.padY ?? 8)}px;
  --ft-link-pad-x:${(b.padX ?? 12)}px;
  --ft-link-font:${(b.fontSize ?? 13)}px;
  --ft-link-weight:${(b.fontWeight ?? 800)};
  --ft-link-hover-bg:${btnHover};

  --ft-m-pad-x:${(m.sectionPadX ?? 16)}px;
  --ft-m-pad-y:${(m.sectionPadY ?? 30)}px;
  --ft-m-h2-size:${(m.h2Size ?? 18)}px;
  --ft-m-logo-img-maxw:${(m.logoImgMaxWidth ?? 200)}px;
  --ft-m-photo-size:${(m.photoSize ?? 96)}px;

  /* fonts */
  --ft-h2-font:${h2Font};
  --ft-h3-font:${h3Font};
  --ft-body-font:${bodyFont};
}

/* Preview básico usando as vars (não interfere no site, só no admin) */
.ui-preview .ft-section{
  background: var(--ft-section-bg);
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08);
}
.ui-preview .ft-section h2{
  margin:0 0 8px 0;
  color: var(--ft-h2-color);
  font-size: var(--ft-h2-size);
  font-weight: var(--ft-h2-weight);
  font-family: var(--ft-h2-font);
  border-bottom:2px solid var(--ft-h2-border);
  padding-bottom:8px;
}
.ui-preview .ft-section p{
  margin:0;
  color: var(--ft-team-color);
  font-size: var(--ft-team-font);
  line-height: var(--ft-team-lh);
  font-family: var(--ft-body-font);
}
.ui-preview .ft-person-linkbtn{
  display:inline-flex;
  margin-top:10px;
  background: var(--ft-link-bg);
  border: var(--ft-link-border);
  color: var(--ft-link-color);
  border-radius: var(--ft-link-radius);
  padding: var(--ft-link-pad-y) var(--ft-link-pad-x);
  font-size: var(--ft-link-font);
  font-weight: var(--ft-link-weight);
}

${customCss || ''}`.trim();
}

// ---------- main render ----------
export async function renderAppearanceFichaTecnica(container) {
  container.innerHTML = `
    <div class="adm-card">
      <div class="ui-topbar">
        <div>
          <h2>Aparência → Ficha Técnica</h2>
          <p class="muted">Painel visual (cores + fontes + tamanhos). Não afeta outras páginas.</p>
        </div>
        <div class="ui-actions">
          <button class="btn primary" id="ft_save">Salvar</button>
          <button class="btn light" id="ft_reload">Recarregar</button>
          <span id="ft_msg" class="muted"></span>
        </div>
      </div>

      <div class="adm-subtabs" id="ft_subtabs">
        ${['Seção', 'Tipografia', 'Logos', 'Cards', 'Botões', 'CSS Extra']
          .map((t, i) => `<button class="adm-subtab ${i === 0 ? 'active' : ''}" data-tab="${i}">${t}</button>`)
          .join('')}
      </div>

      <div class="adm-subview" id="ft_view"></div>
    </div>
  `;

  const msg = container.querySelector('#ft_msg');
  const view = container.querySelector('#ft_view');

  const loadRow = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('appearance_json, custom_css')
      .eq('config_key', 'main')
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
  let customCss = row?.custom_css || '';

  let ft = deepGet(appearance, PATH) || {};
  if (!ft || typeof ft !== 'object') ft = {};

  // preview style
  const preview = () => {
    const style = ensureStyle('adminFTAppearancePreview');
    style.textContent = buildFTVars(ft, customCss);
  };

  // ---- tab renderers ----
  const renderTab = (idx) => {
    // TAB 0: Seção
    if (idx === 0) {
      const s = ft.section || {};
      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>Seção</h3>
              <p class="ui-muted">A caixa principal da Ficha Técnica (fundo, radius, espaçamento).</p>
            </div>
            <div class="ui-preview">
              <div class="page-ficha-tecnica">
                <div class="ft-section" style="padding:14px;">
                  <h2>Equipe da Pesquisa</h2>
                  <p>Texto descritivo da ficha técnica aparece aqui.</p>
                  <a class="ft-person-linkbtn" href="javascript:void(0)">Ver link</a>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Fundo da seção</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Cor do fundo</label>
                ${renderColorGrid('sec_bg', s.bg || '#ffffff')}
              </div>

              <div class="ui-control">
                <label>Radius</label>
                <div class="ui-row">
                  <input type="range" id="sec_radius" min="0" max="30" value="${s.radius ?? 10}">
                  <span class="ui-mini" id="sec_radius_val">${s.radius ?? 10}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Padding vertical</label>
                <div class="ui-row">
                  <input type="range" id="sec_pady" min="0" max="90" value="${s.padY ?? 44}">
                  <span class="ui-mini" id="sec_pady_val">${s.padY ?? 44}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Padding lateral</label>
                <div class="ui-row">
                  <input type="range" id="sec_padx" min="0" max="60" value="${s.padX ?? 22}">
                  <span class="ui-mini" id="sec_padx_val">${s.padX ?? 22}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Largura máxima</label>
                <div class="ui-row">
                  <input type="range" id="sec_maxw" min="800" max="1500" value="${s.maxWidth ?? 1100}">
                  <span class="ui-mini" id="sec_maxw_val">${s.maxWidth ?? 1100}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Distância entre seções</label>
                <div class="ui-row">
                  <input type="range" id="sec_gap" min="0" max="60" value="${s.gap ?? 18}">
                  <span class="ui-mini" id="sec_gap_val">${s.gap ?? 18}px</span>
                </div>
              </div>

              <div class="ui-control ui-full">
                <label>Sombra (pronto / simples)</label>
                <div class="ui-presets">
                  <button class="ui-preset" data-shadow="0 0 0 rgba(0,0,0,0)">Sem sombra</button>
                  <button class="ui-preset" data-shadow="0 4px 15px rgba(0,0,0,0.05)">Leve</button>
                  <button class="ui-preset" data-shadow="0 8px 20px rgba(0,0,0,0.12)">Média</button>
                  <button class="ui-preset" data-shadow="0 12px 30px rgba(0,0,0,0.18)">Forte</button>
                </div>
                <input class="ui-input" type="text" id="sec_shadow" value="${s.shadow || '0 4px 15px rgba(0,0,0,0.05)'}">
                <p class="ui-muted" style="margin-top:6px">Opcional: pode editar o texto da sombra se quiser.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      bindColorGrid(view, 'sec_bg', (v) => {
        ft.section = { ...(ft.section || {}), bg: v };
        preview();
      });

      const sync = () => {
        const radius = Number(view.querySelector('#sec_radius').value);
        const padY = Number(view.querySelector('#sec_pady').value);
        const padX = Number(view.querySelector('#sec_padx').value);
        const maxWidth = Number(view.querySelector('#sec_maxw').value);
        const gap = Number(view.querySelector('#sec_gap').value);
        const shadow = view.querySelector('#sec_shadow').value;

        view.querySelector('#sec_radius_val').textContent = `${radius}px`;
        view.querySelector('#sec_pady_val').textContent = `${padY}px`;
        view.querySelector('#sec_padx_val').textContent = `${padX}px`;
        view.querySelector('#sec_maxw_val').textContent = `${maxWidth}px`;
        view.querySelector('#sec_gap_val').textContent = `${gap}px`;

        ft.section = { ...(ft.section || {}), radius, padY, padX, maxWidth, gap, shadow };
        preview();
      };

      view.querySelectorAll('input[type="range"]').forEach((el) => el.addEventListener('input', sync));
      view.querySelector('#sec_shadow').addEventListener('input', sync);

      view.querySelectorAll('.ui-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          view.querySelector('#sec_shadow').value = btn.dataset.shadow;
          sync();
        });
      });

      sync();
      return;
    }

    // TAB 1: Tipografia (Título / Descrição / H3)
    if (idx === 1) {
      const t = ft.titles || {};
      const tt = ft.teamText || {};

      const h2Font = t.h2Font || FONT_OPTIONS[0].value;
      const h3Font = t.logoH3Font || FONT_OPTIONS[0].value;
      const bodyFont = tt.font || FONT_OPTIONS[0].value;

      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>Tipografia</h3>
              <p class="ui-muted">Separado: cor/fonte/tamanho do Título, Descrição e Subtítulo.</p>
            </div>
            <div class="ui-preview">
              <div class="page-ficha-tecnica">
                <div class="ft-section" style="padding:14px;">
                  <h2>Equipe da Pesquisa</h2>
                  <p>Texto descritivo da ficha técnica aparece aqui.</p>
                  <div style="margin-top:10px;font-weight:800;">Realização</div>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Título (H2)</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Cor do título</label>
                ${renderColorGrid('h2_color', t.h2Color || '#0f3d2e')}
              </div>
              <div class="ui-control">
                <label>Fonte do título</label>
                ${renderFontSelect('h2_font', h2Font)}
              </div>
              <div class="ui-control">
                <label>Tamanho</label>
                <div class="ui-row">
                  <input type="range" id="h2_size" min="14" max="34" value="${t.h2Size ?? 20}">
                  <span class="ui-mini" id="h2_size_val">${t.h2Size ?? 20}px</span>
                </div>
              </div>
              <div class="ui-control">
                <label>Peso</label>
                <div class="ui-row">
                  <input type="range" id="h2_weight" min="300" max="900" step="100" value="${t.h2Weight ?? 800}">
                  <span class="ui-mini" id="h2_weight_val">${t.h2Weight ?? 800}</span>
                </div>
              </div>
              <div class="ui-control ui-full">
                <label>Cor da linha (borda embaixo)</label>
                ${renderColorGrid('h2_border', t.h2BorderColor || '#eeeeee')}
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Descrição (Texto)</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Cor do texto</label>
                ${renderColorGrid('body_color', tt.color || '#2f2f2f')}
              </div>
              <div class="ui-control">
                <label>Fonte do texto</label>
                ${renderFontSelect('body_font', bodyFont)}
              </div>
              <div class="ui-control">
                <label>Tamanho</label>
                <div class="ui-row">
                  <input type="range" id="body_size" min="11" max="20" value="${tt.fontSize ?? 14}">
                  <span class="ui-mini" id="body_size_val">${tt.fontSize ?? 14}px</span>
                </div>
              </div>
              <div class="ui-control">
                <label>Altura da linha</label>
                <div class="ui-row">
                  <input type="range" id="body_lh" min="1.2" max="2" step="0.05" value="${tt.lineHeight ?? 1.55}">
                  <span class="ui-mini" id="body_lh_val">${tt.lineHeight ?? 1.55}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Subtítulo (H3 dos logos)</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Cor do subtítulo</label>
                ${renderColorGrid('h3_color', t.logoH3Color || '#0f3d2e')}
              </div>
              <div class="ui-control">
                <label>Fonte do subtítulo</label>
                ${renderFontSelect('h3_font', h3Font)}
              </div>
              <div class="ui-control">
                <label>Tamanho</label>
                <div class="ui-row">
                  <input type="range" id="h3_size" min="10" max="22" value="${t.logoH3Size ?? 14}">
                  <span class="ui-mini" id="h3_size_val">${t.logoH3Size ?? 14}px</span>
                </div>
              </div>
              <div class="ui-control">
                <label>Peso</label>
                <div class="ui-row">
                  <input type="range" id="h3_weight" min="300" max="900" step="100" value="${t.logoH3Weight ?? 800}">
                  <span class="ui-mini" id="h3_weight_val">${t.logoH3Weight ?? 800}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // color binds
      bindColorGrid(view, 'h2_color', (v) => {
        ft.titles = { ...(ft.titles || {}), h2Color: v };
        preview();
      });
      bindColorGrid(view, 'h2_border', (v) => {
        ft.titles = { ...(ft.titles || {}), h2BorderColor: v };
        preview();
      });
      bindColorGrid(view, 'body_color', (v) => {
        ft.teamText = { ...(ft.teamText || {}), color: v };
        preview();
      });
      bindColorGrid(view, 'h3_color', (v) => {
        ft.titles = { ...(ft.titles || {}), logoH3Color: v };
        preview();
      });

      const sync = () => {
        const h2Size = Number(view.querySelector('#h2_size').value);
        const h2Weight = Number(view.querySelector('#h2_weight').value);
        const bodySize = Number(view.querySelector('#body_size').value);
        const bodyLh = Number(view.querySelector('#body_lh').value);
        const h3Size = Number(view.querySelector('#h3_size').value);
        const h3Weight = Number(view.querySelector('#h3_weight').value);

        view.querySelector('#h2_size_val').textContent = `${h2Size}px`;
        view.querySelector('#h2_weight_val').textContent = `${h2Weight}`;
        view.querySelector('#body_size_val').textContent = `${bodySize}px`;
        view.querySelector('#body_lh_val').textContent = `${bodyLh}`;
        view.querySelector('#h3_size_val').textContent = `${h3Size}px`;
        view.querySelector('#h3_weight_val').textContent = `${h3Weight}`;

        ft.titles = {
          ...(ft.titles || {}),
          h2Size,
          h2Weight,
          h2Font: view.querySelector('#h2_font').value,
          logoH3Size: h3Size,
          logoH3Weight: h3Weight,
          logoH3Font: view.querySelector('#h3_font').value,
        };

        ft.teamText = {
          ...(ft.teamText || {}),
          fontSize: bodySize,
          lineHeight: bodyLh,
          font: view.querySelector('#body_font').value,
        };

        preview();
      };

      view.querySelectorAll('input[type="range"]').forEach((el) => el.addEventListener('input', sync));
      view.querySelectorAll('select').forEach((el) => el.addEventListener('change', sync));

      sync();
      return;
    }

    // TAB 2: Logos (simples e visual)
    if (idx === 2) {
      const l = ft.logos || {};
      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>Logos</h3>
              <p class="ui-muted">Controle de espaçamento e tamanho das imagens de logo.</p>
            </div>
            <div class="ui-preview">
              <div class="page-ficha-tecnica">
                <div class="ft-section" style="padding:14px;">
                  <div style="font-weight:800;margin-bottom:8px;">Realização</div>
                  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <div style="width:90px;height:40px;border:1px dashed #ddd;border-radius:10px;"></div>
                    <div style="width:90px;height:40px;border:1px dashed #ddd;border-radius:10px;"></div>
                    <div style="width:90px;height:40px;border:1px dashed #ddd;border-radius:10px;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Ajustes</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Espaço entre logos</label>
                <div class="ui-row">
                  <input type="range" id="lg_gap" min="0" max="90" value="${l.gridGap ?? 40}">
                  <span class="ui-mini" id="lg_gap_val">${l.gridGap ?? 40}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Padding da caixa do logo</label>
                <div class="ui-row">
                  <input type="range" id="lg_pad" min="0" max="60" value="${l.boxPad ?? 18}">
                  <span class="ui-mini" id="lg_pad_val">${l.boxPad ?? 18}px</span>
                </div>
              </div>

              <div class="ui-control ui-full">
                <label>Tamanho máximo do logo</label>
                <div class="ui-row">
                  <input type="range" id="lg_maxw" min="80" max="520" value="${l.imgMaxWidth ?? 240}">
                  <span class="ui-mini" id="lg_maxw_val">${l.imgMaxWidth ?? 240}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      const sync = () => {
        const gridGap = Number(view.querySelector('#lg_gap').value);
        const boxPad = Number(view.querySelector('#lg_pad').value);
        const imgMaxWidth = Number(view.querySelector('#lg_maxw').value);

        view.querySelector('#lg_gap_val').textContent = `${gridGap}px`;
        view.querySelector('#lg_pad_val').textContent = `${boxPad}px`;
        view.querySelector('#lg_maxw_val').textContent = `${imgMaxWidth}px`;

        ft.logos = { ...(ft.logos || {}), gridGap, boxPad, imgMaxWidth };
        preview();
      };

      view.querySelectorAll('input[type="range"]').forEach((el) => el.addEventListener('input', sync));
      sync();
      return;
    }

    // TAB 3: Cards (visual básico, sem termos técnicos demais)
    if (idx === 3) {
      const c = ft.cards || {};
      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>Cards</h3>
              <p class="ui-muted">Cartões dos integrantes (fundo, cor do nome, cor do cargo, radius e foto).</p>
            </div>
            <div class="ui-preview">
              <div class="page-ficha-tecnica">
                <div class="ft-section" style="padding:14px;">
                  <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="width:220px;border-radius:16px;padding:12px;background:var(--ft-card-bg);color:var(--ft-name-color);box-shadow:var(--ft-card-shadow);">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:48px;height:48px;border-radius:999px;background:rgba(255,255,255,0.2);"></div>
                        <div>
                          <div style="font-weight:800;">Nome</div>
                          <div style="color:var(--ft-role-color);font-weight:700;font-size:13px;">Cargo</div>
                        </div>
                      </div>
                      <a class="ft-person-linkbtn" href="javascript:void(0)">Ver link</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Cores</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Fundo do card</label>
                ${renderColorGrid('card_bg', c.bg || '#0f3d2e')}
              </div>
              <div class="ui-control">
                <label>Cor do nome</label>
                ${renderColorGrid('card_name', c.nameColor || '#ffffff')}
              </div>
              <div class="ui-control">
                <label>Cor do cargo</label>
                ${renderColorGrid('card_role', c.roleColor || '#ffdd9a')}
              </div>
              <div class="ui-control">
                <label>Radius</label>
                <div class="ui-row">
                  <input type="range" id="card_radius" min="0" max="30" value="${c.radius ?? 12}">
                  <span class="ui-mini" id="card_radius_val">${c.radius ?? 12}px</span>
                </div>
              </div>
              <div class="ui-control">
                <label>Tamanho da foto</label>
                <div class="ui-row">
                  <input type="range" id="card_photo" min="60" max="160" value="${c.photoSize ?? 120}">
                  <span class="ui-mini" id="card_photo_val">${c.photoSize ?? 120}px</span>
                </div>
              </div>

              <div class="ui-control ui-full">
                <label>Sombra (pronto / simples)</label>
                <div class="ui-presets">
                  <button class="ui-preset" data-shadow="0 0 0 rgba(0,0,0,0)">Sem sombra</button>
                  <button class="ui-preset" data-shadow="0 4px 15px rgba(0,0,0,0.12)">Leve</button>
                  <button class="ui-preset" data-shadow="0 10px 25px rgba(0,0,0,0.25)">Média</button>
                  <button class="ui-preset" data-shadow="0 16px 36px rgba(0,0,0,0.30)">Forte</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      bindColorGrid(view, 'card_bg', (v) => { ft.cards = { ...(ft.cards || {}), bg: v }; preview(); });
      bindColorGrid(view, 'card_name', (v) => { ft.cards = { ...(ft.cards || {}), nameColor: v }; preview(); });
      bindColorGrid(view, 'card_role', (v) => { ft.cards = { ...(ft.cards || {}), roleColor: v }; preview(); });

      const sync = () => {
        const radius = Number(view.querySelector('#card_radius').value);
        const photoSize = Number(view.querySelector('#card_photo').value);
        view.querySelector('#card_radius_val').textContent = `${radius}px`;
        view.querySelector('#card_photo_val').textContent = `${photoSize}px`;
        ft.cards = { ...(ft.cards || {}), radius, photoSize };
        preview();
      };
      view.querySelectorAll('input[type="range"]').forEach((el) => el.addEventListener('input', sync));
      sync();

      view.querySelectorAll('.ui-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          ft.cards = { ...(ft.cards || {}), shadow: btn.dataset.shadow };
          preview();
        });
      });

      return;
    }

    // TAB 4: Botões (Botão Link) — moderno, sem rgba/borda técnica
    if (idx === 4) {
      const b = ft.linkBtn || {};
      const bgHex = b.bgHex || '#ffffff';
      const bgAlpha = b.bgAlpha ?? 12;
      const bdHex = b.borderHex || '#ffffff';
      const bdAlpha = b.borderAlpha ?? 20;
      const borderW = b.borderW ?? 1;

      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>Botões</h3>
              <p class="ui-muted">Estilo do botão “Link” dentro dos cards.</p>
            </div>
            <div class="ui-preview">
              <div class="page-ficha-tecnica">
                <div class="ft-section" style="padding:14px;">
                  <a class="ft-person-linkbtn" href="javascript:void(0)">Ver link</a>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Cores</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Cor do texto</label>
                ${renderColorGrid('btn_text', b.color || '#111111')}
              </div>

              <div class="ui-control">
                <label>Fundo</label>
                ${renderColorGrid('btn_bg', bgHex)}
                <div class="ui-row" style="margin-top:10px">
                  <span class="ui-mini">Opacidade</span>
                  <input type="range" id="btn_bg_a" min="0" max="100" value="${bgAlpha}">
                  <span class="ui-mini" id="btn_bg_a_val">${bgAlpha}%</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Borda</label>
                ${renderColorGrid('btn_bd', bdHex)}
                <div class="ui-row" style="margin-top:10px">
                  <span class="ui-mini">Espessura</span>
                  <input type="range" id="btn_bw" min="0" max="6" value="${borderW}">
                  <span class="ui-mini" id="btn_bw_val">${borderW}px</span>
                </div>
                <div class="ui-row">
                  <span class="ui-mini">Opacidade</span>
                  <input type="range" id="btn_bd_a" min="0" max="100" value="${bdAlpha}">
                  <span class="ui-mini" id="btn_bd_a_val">${bdAlpha}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="ui-block">
            <div class="ui-blocktitle">Tamanho e forma</div>
            <div class="ui-split">
              <div class="ui-control">
                <label>Radius</label>
                <div class="ui-row">
                  <input type="range" id="btn_r" min="0" max="999" value="${b.radius ?? 999}">
                  <span class="ui-mini" id="btn_r_val">${b.radius ?? 999}</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Tamanho da fonte</label>
                <div class="ui-row">
                  <input type="range" id="btn_fs" min="10" max="20" value="${b.fontSize ?? 13}">
                  <span class="ui-mini" id="btn_fs_val">${b.fontSize ?? 13}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Peso</label>
                <div class="ui-row">
                  <input type="range" id="btn_fw" min="300" max="900" step="100" value="${b.fontWeight ?? 800}">
                  <span class="ui-mini" id="btn_fw_val">${b.fontWeight ?? 800}</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Padding vertical</label>
                <div class="ui-row">
                  <input type="range" id="btn_py" min="0" max="18" value="${b.padY ?? 8}">
                  <span class="ui-mini" id="btn_py_val">${b.padY ?? 8}px</span>
                </div>
              </div>

              <div class="ui-control">
                <label>Padding lateral</label>
                <div class="ui-row">
                  <input type="range" id="btn_px" min="0" max="28" value="${b.padX ?? 12}">
                  <span class="ui-mini" id="btn_px_val">${b.padX ?? 12}px</span>
                </div>
              </div>

              <div class="ui-control ui-full">
                <label>Presets (1 clique)</label>
                <div class="ui-presets">
                  <button class="ui-preset" data-preset="inst">Institucional</button>
                  <button class="ui-preset" data-preset="brown">Marrom + branco</button>
                  <button class="ui-preset" data-preset="dark">Dark elegante</button>
                  <button class="ui-preset" data-preset="clean">Clean</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // binds
      bindColorGrid(view, 'btn_text', (v) => {
        ft.linkBtn = { ...(ft.linkBtn || {}), color: v };
        sync();
      });
      bindColorGrid(view, 'btn_bg', (v) => {
        ft.linkBtn = { ...(ft.linkBtn || {}), bgHex: v };
        sync();
      });
      bindColorGrid(view, 'btn_bd', (v) => {
        ft.linkBtn = { ...(ft.linkBtn || {}), borderHex: v };
        sync();
      });

      const setPreset = (p) => {
        if (p === 'inst') {
          ft.linkBtn = { ...(ft.linkBtn || {}),
            bgHex: '#0f3d2e', bgAlpha: 12,
            color: '#0f3d2e',
            borderHex: '#0f3d2e', borderAlpha: 25, borderW: 1
          };
        }
        if (p === 'brown') {
          ft.linkBtn = { ...(ft.linkBtn || {}),
            bgHex: '#5a2a12', bgAlpha: 14,
            color: '#ffffff',
            borderHex: '#ffffff', borderAlpha: 18, borderW: 1
          };
        }
        if (p === 'dark') {
          ft.linkBtn = { ...(ft.linkBtn || {}),
            bgHex: '#000000', bgAlpha: 16,
            color: '#ffffff',
            borderHex: '#ffffff', borderAlpha: 18, borderW: 1
          };
        }
        if (p === 'clean') {
          ft.linkBtn = { ...(ft.linkBtn || {}),
            bgHex: '#ffffff', bgAlpha: 0,
            color: '#111111',
            borderHex: '#111111', borderAlpha: 12, borderW: 1
          };
        }
      };

      const sync = () => {
        const b2 = ft.linkBtn || {};
        const bgA = Number(view.querySelector('#btn_bg_a').value);
        const bdA = Number(view.querySelector('#btn_bd_a').value);
        const bw = Number(view.querySelector('#btn_bw').value);
        const r = Number(view.querySelector('#btn_r').value);
        const fs = Number(view.querySelector('#btn_fs').value);
        const fw = Number(view.querySelector('#btn_fw').value);
        const py = Number(view.querySelector('#btn_py').value);
        const px = Number(view.querySelector('#btn_px').value);

        view.querySelector('#btn_bg_a_val').textContent = `${bgA}%`;
        view.querySelector('#btn_bd_a_val').textContent = `${bdA}%`;
        view.querySelector('#btn_bw_val').textContent = `${bw}px`;
        view.querySelector('#btn_r_val').textContent = `${r}`;
        view.querySelector('#btn_fs_val').textContent = `${fs}px`;
        view.querySelector('#btn_fw_val').textContent = `${fw}`;
        view.querySelector('#btn_py_val').textContent = `${py}px`;
        view.querySelector('#btn_px_val').textContent = `${px}px`;

        const bgHex2 = b2.bgHex || bgHex;
        const bdHex2 = b2.borderHex || bdHex;

        ft.linkBtn = {
          ...(b2),
          bgAlpha: bgA,
          borderAlpha: bdA,
          borderW: bw,
          radius: r,
          fontSize: fs,
          fontWeight: fw,
          padY: py,
          padX: px,

          // compat: strings usadas pelo front
          bg: hexToRgba(bgHex2, bgA),
          border: `${bw}px solid ${hexToRgba(bdHex2, bdA)}`,
          hoverBg: hexToRgba(bgHex2, Math.min(bgA + 8, 100)),
        };

        preview();
      };

      view.querySelectorAll('input[type="range"]').forEach((el) => el.addEventListener('input', sync));
      view.querySelectorAll('.ui-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          setPreset(btn.dataset.preset);
          // atualizar sliders conforme preset (mantém UX)
          const b3 = ft.linkBtn || {};
          view.querySelector('#btn_bg_a').value = b3.bgAlpha ?? 12;
          view.querySelector('#btn_bd_a').value = b3.borderAlpha ?? 20;
          view.querySelector('#btn_bw').value = b3.borderW ?? 1;
          sync();
        });
      });

      sync();
      return;
    }

    // TAB 5: CSS Extra
    if (idx === 5) {
      view.innerHTML = `
        <div class="ui-card">
          <div class="ui-head">
            <div>
              <h3>CSS Extra</h3>
              <p class="ui-muted">Use só se precisar. Preferível controlar pelos seletores acima.</p>
            </div>
          </div>
          <textarea id="ft_custom_css" class="ui-textarea" rows="12" placeholder="CSS extra (opcional)">${customCss || ''}</textarea>
        </div>
      `;
      view.querySelector('#ft_custom_css').addEventListener('input', (e) => {
        customCss = e.target.value;
        preview();
      });
      return;
    }
  };

  // subtabs click
  container.querySelector('#ft_subtabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.adm-subtab');
    if (!btn) return;
    container.querySelectorAll('.adm-subtab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderTab(Number(btn.dataset.tab));
  });

  // actions
  container.querySelector('#ft_reload').addEventListener('click', async () => {
    msg.textContent = 'Recarregando...';
    try {
      row = await loadRow();
      appearance = row?.appearance_json || {};
      customCss = row?.custom_css || '';
      ft = deepGet(appearance, PATH) || {};
      if (!ft || typeof ft !== 'object') ft = {};
      renderTab(0);
      preview();
      msg.textContent = 'Recarregado ✅';
    } catch (e) {
      msg.textContent = `Erro: ${e.message}`;
    }
  });

  container.querySelector('#ft_save').addEventListener('click', async () => {
    msg.textContent = 'Salvando...';

    const nextAppearance = JSON.parse(JSON.stringify(appearance || {}));
    deepSet(nextAppearance, PATH, ft);

    const { error } = await supabase
      .from('site_config')
      .update({ appearance_json: nextAppearance, custom_css: customCss })
      .eq('config_key', 'main');

    msg.textContent = error ? `Erro ao salvar: ${error.message}` : '✅ Salvo com sucesso!';
  });

  // init
  renderTab(0);
  preview();
}
