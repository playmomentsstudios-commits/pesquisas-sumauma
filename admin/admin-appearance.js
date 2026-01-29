const DEFAULTS = {
  colors: {
    green:'#0f3d2e', brown:'#5a2a12', gold:'#ffdd9a',
    bg:'#f4f4f4', text:'#222222', muted:'#555555', line:'#e5e5e5',
  },
  tabs: { radius:12, fontSize:13, padY:8, padX:8, gap:8 },
  header: { mobileHeight:200, searchBottom:12, overlayPadX:20, overlayPadBottom:64 }
};

function mergeDefaults(ap){
  return {
    colors: { ...DEFAULTS.colors, ...(ap?.colors||{}) },
    tabs: { ...DEFAULTS.tabs, ...(ap?.tabs||{}) },
    header: { ...DEFAULTS.header, ...(ap?.header||{}) },
  };
}

function buildCss(ap, customCss=''){
  const a = mergeDefaults(ap);
  return `
:root{
  --green:${a.colors.green};
  --brown:${a.colors.brown};
  --gold:${a.colors.gold};
  --bg:${a.colors.bg};
  --text:${a.colors.text};
  --muted:${a.colors.muted};
  --line:${a.colors.line};

  --tab-radius:${a.tabs.radius}px;
  --tab-font-size:${a.tabs.fontSize}px;
  --tab-pad-y:${a.tabs.padY}px;
  --tab-pad-x:${a.tabs.padX}px;
  --tab-gap:${a.tabs.gap}px;

  --header-mobile-height:${a.header.mobileHeight}px;
  --header-search-bottom:${a.header.searchBottom}px;
  --header-overlay-pad-x:${a.header.overlayPadX}px;
  --header-overlay-pad-bottom:${a.header.overlayPadBottom}px;
}
${customCss || ''}`.trim();
}

function ensurePreviewStyle(){
  let style = document.getElementById('adminAppearancePreview');
  if(!style){
    style = document.createElement('style');
    style.id = 'adminAppearancePreview';
    document.head.appendChild(style);
  }
  return style;
}

export async function renderAppearanceTab(container){
  container.innerHTML = `
  <div class="adm-card">
    <h2>Aparência</h2>
    <p class="muted">Altere cores, botões e ajustes mobile sem mexer no CSS manualmente.</p>

    <div class="adm-grid">
      <section class="adm-section">
        <h3>Cores</h3>
        ${['green','brown','gold','bg','text','muted','line'].map(k=>`
          <label class="adm-field">
            <span>${k}</span>
            <input type="color" id="ap_${k}">
          </label>
        `).join('')}
      </section>

      <section class="adm-section">
        <h3>Sub-abas (Pesquisa/Relatório/Mapa/Ficha Técnica)</h3>
        ${[
          ['radius','Radius',0,30],
          ['fontSize','Fonte',10,18],
          ['padY','Padding Y',0,20],
          ['padX','Padding X',0,20],
          ['gap','Gap',0,16],
        ].map(([k,label,min,max])=>`
          <label class="adm-field">
            <span>${label}</span>
            <input type="number" id="ap_tab_${k}" min="${min}" max="${max}">
          </label>
        `).join('')}
      </section>

      <section class="adm-section">
        <h3>Header (Mobile)</h3>
        ${[
          ['mobileHeight','Altura do banner',120,320],
          ['searchBottom','Busca (distância do fundo)',0,40],
          ['overlayPadX','Padding lateral',0,40],
          ['overlayPadBottom','Padding inferior',0,120],
        ].map(([k,label,min,max])=>`
          <label class="adm-field">
            <span>${label}</span>
            <input type="number" id="ap_head_${k}" min="${min}" max="${max}">
          </label>
        `).join('')}
      </section>

      <section class="adm-section">
        <h3>CSS Extra (opcional)</h3>
        <textarea id="ap_custom_css" rows="10" placeholder="Cole CSS adicional aqui (opcional)"></textarea>
      </section>
    </div>

    <div class="adm-actions">
      <button class="btn primary" id="ap_save">Salvar</button>
      <button class="btn light" id="ap_reset">Restaurar padrão</button>
      <span id="ap_msg" class="muted"></span>
    </div>
  </div>
  `;

  const msg = container.querySelector('#ap_msg');
  const supabase = await window.getSupabaseClient?.();
  if (!supabase) {
    msg.textContent = "Supabase não configurado. Verifique js/supabase-config.js.";
    return;
  }

  const { data, error } = await supabase
    .from('site_config')
    .select('config_key, appearance_json, custom_css')
    .eq('config_key', 'main')
    .maybeSingle();

  if(error){
    msg.textContent = `Erro ao carregar: ${error.message}`;
    return;
  }

  let appearance = mergeDefaults(data?.appearance_json || {});
  let customCss = data?.custom_css || '';

  const setForm = () => {
    Object.entries(appearance.colors).forEach(([k,v])=>{
      const el = container.querySelector(`#ap_${k}`);
      if(el) el.value = v;
    });
    Object.entries(appearance.tabs).forEach(([k,v])=>{
      const el = container.querySelector(`#ap_tab_${k}`);
      if(el) el.value = v;
    });
    Object.entries(appearance.header).forEach(([k,v])=>{
      const el = container.querySelector(`#ap_head_${k}`);
      if(el) el.value = v;
    });
    container.querySelector('#ap_custom_css').value = customCss;
  };

  const preview = () => {
    const style = ensurePreviewStyle();
    style.textContent = buildCss(appearance, customCss);
  };

  const readForm = () => {
    const colors = {};
    ['green','brown','gold','bg','text','muted','line'].forEach(k=>{
      colors[k] = container.querySelector(`#ap_${k}`)?.value || DEFAULTS.colors[k];
    });

    const tabs = {};
    ['radius','fontSize','padY','padX','gap'].forEach(k=>{
      tabs[k] = Number(container.querySelector(`#ap_tab_${k}`)?.value ?? DEFAULTS.tabs[k]);
    });

    const header = {};
    ['mobileHeight','searchBottom','overlayPadX','overlayPadBottom'].forEach(k=>{
      header[k] = Number(container.querySelector(`#ap_head_${k}`)?.value ?? DEFAULTS.header[k]);
    });

    customCss = container.querySelector('#ap_custom_css').value || '';
    appearance = { colors, tabs, header };
  };

  setForm();
  preview();

  container.addEventListener('input', () => {
    readForm();
    preview();
  });

  container.querySelector('#ap_reset').addEventListener('click', () => {
    appearance = mergeDefaults({});
    customCss = '';
    setForm();
    preview();
    msg.textContent = 'Padrão restaurado (prévia aplicada).';
  });

  container.querySelector('#ap_save').addEventListener('click', async () => {
    readForm();
    msg.textContent = 'Salvando...';

    const { error: updErr } = await supabase
      .from('site_config')
      .upsert(
        { config_key: 'main', appearance_json: appearance, custom_css: customCss },
        { onConflict: 'config_key' }
      );

    msg.textContent = updErr
      ? `Erro ao salvar: ${updErr.message}`
      : '✅ Aparência salva com sucesso!';
  });
}
