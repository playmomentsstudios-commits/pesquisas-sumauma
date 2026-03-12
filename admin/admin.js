/**
 * Admin V6 - Sistema de Gerenciamento de Pesquisas
 * Instituto Sumaúma
 * 
 * Arquitetura modular com separação clara de concerns:
 * - State: Gerenciamento centralizado de estado
 * - API: Comunicação com Supabase
 * - UI: Renderização e manipulação de DOM
 * - Events: Handlers de eventos
 * - Utils: Funções utilitárias
 */

// ==========================================
// SECAO 1: CONFIGURACAO E ESTADO GLOBAL
// ==========================================

const CONFIG = {
  STORAGE_BUCKET: 'site-assets',
  DEBOUNCE_DELAY: 300,
  MAX_RESEARCH_ITEMS: 100,
  DEFAULT_COORDS: { lat: -15.7975, lng: -47.8919 }
};

const state = {
  supabase: null,
  session: null,
  user: null,
  researches: [],
  currentResearch: null,
  points: [],
  editingPoint: null,
  activePanel: 'pesquisas',
  activeEditorTab: 'general',
  isLoading: false,
  filters: {
    search: '',
    status: 'all'
  }
};

// ==========================================
// SECAO 2: UTILITARIOS
// ==========================================

const utils = {
  /**
   * Debounce para eventos frequentes
   */
  debounce(fn, delay = CONFIG.DEBOUNCE_DELAY) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Normaliza string para slug
   */
  slugify(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  },

  /**
   * Escapa HTML para seguranca
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  },

  /**
   * Converte valor para numero ou null
   */
  toNumber(value) {
    const num = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(num) ? num : null;
  },

  /**
   * Formata erro do Supabase para exibicao
   */
  formatError(error) {
    if (!error) return 'Erro desconhecido';
    
    const msg = error.message || String(error);
    const lower = msg.toLowerCase();
    
    if (lower.includes('row-level security') || lower.includes('rls')) {
      return 'Sem permissão. Verifique as policies do Supabase.';
    }
    if (lower.includes('duplicate key') || lower.includes('unique')) {
      return 'Este slug já existe. Escolha outro.';
    }
    if (lower.includes('column') && lower.includes('does not exist')) {
      return 'Campo não existe no banco de dados.';
    }
    if (lower.includes('network') || lower.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet.';
    }
    
    return msg;
  },

  /**
   * Gera URL publica para pesquisa
   */
  getPublicUrl(slug, subpage = '') {
    const cleanSlug = utils.slugify(slug);
    if (!cleanSlug) return '';
    return subpage ? `../${cleanSlug}/${subpage}` : `../${cleanSlug}/`;
  },

  /**
   * Extrai dados de FormData para objeto
   */
  formDataToObject(form) {
    const data = new FormData(form);
    const obj = {};
    for (const [key, value] of data.entries()) {
      if (obj[key] !== undefined) {
        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    }
    return obj;
  },

  /**
   * Mostra/esconde elemento
   */
  toggle(el, show) {
    if (!el) return;
    el.hidden = !show;
  },

  /**
   * Define texto seguro em elemento
   */
  setText(el, text) {
    if (!el) return;
    el.textContent = text || '';
  },

  /**
   * Mostra alerta temporario
   */
  showAlert(container, message, type = 'info', duration = 5000) {
    if (!container) return;
    
    container.className = `alert alert--${type}`;
    container.textContent = message;
    container.hidden = false;
    
    if (duration > 0) {
      setTimeout(() => {
        container.hidden = true;
      }, duration);
    }
  },

  /**
   * Controla estado de loading em botao
   */
  setButtonLoading(btn, loading) {
    if (!btn) return;
    const text = btn.querySelector('.btn__text');
    const loader = btn.querySelector('.btn__loader');
    
    btn.disabled = loading;
    if (text) text.hidden = loading;
    if (loader) loader.hidden = !loading;
  }
};

// ==========================================
// SECAO 3: API E DATA LAYER
// ==========================================

const api = {
  /**
   * Inicializa cliente Supabase
   */
  async init() {
    try {
      await window.__SUPABASE_CONFIG_LOADED__;
      
      if (!window.getSupabaseClient) {
        throw new Error('Supabase client nao configurado');
      }
      
      state.supabase = await window.getSupabaseClient();
      
      if (!state.supabase) {
        throw new Error('Falha ao inicializar Supabase');
      }
      
      return true;
    } catch (err) {
      console.error('[API] Init error:', err);
      return false;
    }
  },

  /**
   * Autenticacao
   */
  auth: {
    async getSession() {
      if (!state.supabase) return null;
      const { data } = await state.supabase.auth.getSession();
      return data?.session || null;
    },

    async signIn(email, password) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      if (!state.supabase) return;
      await state.supabase.auth.signOut();
    },

    onAuthChange(callback) {
      if (!state.supabase) return () => {};
      return state.supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
    }
  },

  /**
   * Pesquisas
   */
  researches: {
    async list() {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { data, error } = await state.supabase
        .from('pesquisas')
        .select('id, slug, titulo, ano_base, ordem, descricao_curta, sinopse, status, csv_fallback, capa_url, relatorio_pdf_url, leitura_url, banner_url, config_json, updated_at')
        .order('ordem', { ascending: true })
        .order('updated_at', { ascending: false })
        .limit(CONFIG.MAX_RESEARCH_ITEMS);
      
      if (error) throw error;
      return data || [];
    },

    async getById(id) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { data, error } = await state.supabase
        .from('pesquisas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async create(payload) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { data, error } = await state.supabase
        .from('pesquisas')
        .insert(payload)
        .select('id, slug, titulo')
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { data, error } = await state.supabase
        .from('pesquisas')
        .update(payload)
        .eq('id', id)
        .select('id, slug, titulo')
        .single();
      
      if (error) throw error;
      return data;
    },

    async delete(id) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { error } = await state.supabase
        .from('pesquisas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },

    async duplicate(sourceId, newSlug) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const source = await api.researches.getById(sourceId);
      if (!source) throw new Error('Pesquisa origem nao encontrada');
      
      const payload = {
        slug: newSlug,
        titulo: `${source.titulo || ''} (Cópia)`.trim(),
        ano_base: source.ano_base,
        ordem: (source.ordem || 0) + 1,
        descricao_curta: source.descricao_curta,
        sinopse: source.sinopse,
        status: false,
        csv_fallback: source.csv_fallback,
        capa_url: source.capa_url,
        relatorio_pdf_url: source.relatorio_pdf_url,
        leitura_url: source.leitura_url,
        config_json: source.config_json
      };
      
      return api.researches.create(payload);
    }
  },

  /**
   * Pontos do mapa
   */
  points: {
    async listByResearch(researchId) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { data, error } = await state.supabase
        .from('pontos')
        .select('*')
        .eq('pesquisa_id', researchId)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },

    async create(payload) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { error } = await state.supabase
        .from('pontos')
        .insert(payload);
      
      if (error) throw error;
    },

    async update(id, payload) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { error } = await state.supabase
        .from('pontos')
        .update(payload)
        .eq('id', id);
      
      if (error) throw error;
    },

    async delete(id) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { error } = await state.supabase
        .from('pontos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },

    async deleteByResearch(researchId) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { error } = await state.supabase
        .from('pontos')
        .delete()
        .eq('pesquisa_id', researchId);
      
      if (error) throw error;
    },

    async batchInsert(points) {
      if (!state.supabase || !points.length) return;
      
      const { error } = await state.supabase
        .from('pontos')
        .insert(points);
      
      if (error) throw error;
    }
  },

  /**
   * Configuracoes do site
   */
  site: {
    async getConfig(key) {
      if (!state.supabase) return '';
      
      const { data, error } = await state.supabase
        .from('site_config')
        .select('value')
        .eq('key', key)
        .limit(1)
        .maybeSingle();
      
      if (error) return '';
      return data?.value || '';
    },

    async setConfig(key, value) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      
      const { error } = await state.supabase
        .from('site_config')
        .upsert({ key, value }, { onConflict: 'key' });
      
      if (error) throw error;
    }
  },

  /**
   * Storage para uploads
   */
  storage: {
    async upload(file, path) {
      if (!state.supabase) throw new Error('Supabase nao inicializado');
      if (!file) return null;
      
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const fullPath = `${path}.${ext}`;
      
      const { error } = await state.supabase.storage
        .from(CONFIG.STORAGE_BUCKET)
        .upload(fullPath, file, { upsert: true });
      
      if (error) throw error;
      
      const { data } = state.supabase.storage
        .from(CONFIG.STORAGE_BUCKET)
        .getPublicUrl(fullPath);
      
      return data?.publicUrl || null;
    }
  }
};

// ==========================================
// SECAO 4: UI RENDERERS
// ==========================================

const ui = {
  /**
   * Atualiza estado de autenticacao na UI
   */
  setAuthState(isAuthenticated) {
    document.body.setAttribute('data-auth-state', isAuthenticated ? 'logged-in' : 'logged-out');
    
    const loginStage = document.getElementById('loginStage');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginStage) loginStage.hidden = isAuthenticated;
    if (adminDashboard) adminDashboard.hidden = !isAuthenticated;
    
    if (isAuthenticated && state.user) {
      const userEmail = document.getElementById('userEmail');
      if (userEmail) userEmail.textContent = state.user.email || 'Autenticado';
    }
  },

  /**
   * Renderiza lista de pesquisas
   */
  renderResearchList(researches) {
    const container = document.getElementById('researchList');
    const emptyState = document.getElementById('researchEmpty');
    
    if (!container) return;
    
    // Filtra pesquisas
    let filtered = researches;
    
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        (r.titulo || '').toLowerCase().includes(search) ||
        (r.slug || '').toLowerCase().includes(search) ||
        (r.ano_base || '').toLowerCase().includes(search)
      );
    }
    
    if (state.filters.status !== 'all') {
      const isPublished = state.filters.status === 'published';
      filtered = filtered.filter(r => r.status === isPublished);
    }
    
    // Mostra/esconde empty state
    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }
    
    if (emptyState) emptyState.hidden = true;
    
    // Renderiza items
    container.innerHTML = filtered.map(research => {
      const isActive = state.currentResearch?.id === research.id;
      const isDraft = !research.status;
      
      return `
        <div class="research-item ${isActive ? 'research-item--active' : ''}" data-id="${research.id}" data-action="select">
          <div class="research-item__header">
            <div>
              <div class="research-item__title">${utils.escapeHtml(research.titulo || 'Sem título')}</div>
              <div class="research-item__slug">/${utils.escapeHtml(research.slug || '')}</div>
            </div>
            <span class="research-item__badge ${isDraft ? 'research-item__badge--draft' : ''}">
              ${isDraft ? 'Rascunho' : 'Publicado'}
            </span>
          </div>
          <div class="research-item__actions" onclick="event.stopPropagation()">
            <button class="btn btn--sm btn--secondary" data-id="${research.id}" data-action="view">Ver</button>
            <button class="btn btn--sm btn--secondary" data-id="${research.id}" data-action="duplicate">Duplicar</button>
            <button class="btn btn--sm btn--danger-outline" data-id="${research.id}" data-action="delete">Excluir</button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Renderiza lista de pontos
   */
  renderPointsList(points) {
    const container = document.getElementById('pointsList');
    const counter = document.getElementById('pointsCounter');
    
    if (!container) return;
    
    // Filtra por busca
    const searchEl = document.getElementById('pointsSearch');
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    
    let filtered = points;
    if (search) {
      filtered = points.filter(p => {
        const text = `${p.nome || ''} ${p.cidade || ''} ${p.categoria || ''}`.toLowerCase();
        return text.includes(search);
      });
    }
    
    // Atualiza contador
    if (counter) {
      counter.textContent = `${filtered.length} ponto${filtered.length !== 1 ? 's' : ''}`;
    }
    
    // Renderiza
    container.innerHTML = filtered.map(point => `
      <div class="point-item" data-id="${point.id}" data-action="editPoint">
        <div class="point-item__info">
          <div class="point-item__name">${utils.escapeHtml(point.nome || 'Sem nome')}</div>
          <div class="point-item__meta">
            ${utils.escapeHtml(point.cidade || '')}${point.uf ? `/${point.uf}` : ''}
            ${point.categoria ? ` • ${utils.escapeHtml(point.categoria)}` : ''}
          </div>
        </div>
        <div class="point-item__actions" onclick="event.stopPropagation()">
          <button class="btn btn--sm btn--secondary" data-id="${point.id}" data-action="editPoint">Editar</button>
          <button class="btn btn--sm btn--danger-outline" data-id="${point.id}" data-action="deletePoint">Excluir</button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Renderiza mapa com pontos
   */
  renderMap(points, slug) {
    const surface = document.getElementById('mapSurface');
    const title = document.getElementById('mapTitle');
    const meta = document.getElementById('mapMeta');
    
    if (!surface) return;
    
    // Limpa mapa
    surface.innerHTML = '';
    
    // Atualiza titulo
    if (title) title.textContent = slug ? `Mapa • ${slug}` : 'Mapa';
    if (meta) meta.textContent = `${points.length} ponto${points.length !== 1 ? 's' : ''}`;
    
    if (points.length === 0) {
      surface.innerHTML = `
        <div class="map-preview__empty">
          <span class="map-preview__empty-icon">🗺</span>
          <p>Sem pontos cadastrados</p>
        </div>
      `;
      return;
    }
    
    // Posicoes fallback para preview
    const fallbackPositions = [
      [18, 24], [34, 56], [50, 38], [63, 68], 
      [77, 28], [24, 74], [84, 58], [58, 18]
    ];
    
    const palette = ['', 'map-node--featured', '', '', 'map-node--featured', '', ''];
    
    points.slice(0, 20).forEach((point, index) => {
      const lat = utils.toNumber(point.lat);
      const lng = utils.toNumber(point.lng);
      
      let top, left;
      
      if (lat !== null && lng !== null) {
        // Converte coordenadas para porcentagem aproximada
        top = Math.max(10, Math.min(82, 50 - ((lat + 15) * 0.9)));
        left = Math.max(8, Math.min(88, 50 + ((lng + 55) * 0.6)));
      } else {
        [top, left] = fallbackPositions[index % fallbackPositions.length];
      }
      
      const node = document.createElement('div');
      node.className = `map-node ${palette[index % palette.length]}`.trim();
      node.style.top = `${top}%`;
      node.style.left = `${left}%`;
      node.title = point.nome || `Ponto ${index + 1}`;
      
      const label = document.createElement('div');
      label.className = 'map-node__label';
      label.textContent = point.nome || `Ponto ${index + 1}`;
      node.appendChild(label);
      
      surface.appendChild(node);
    });
  },

  /**
   * Renderiza item de topico no repeater
   */
  createTopicoItem(data = {}) {
    const div = document.createElement('div');
    div.className = 'repeater-item';
    div.innerHTML = `
      <div class="repeater-item__header">
        <span class="repeater-item__title">Tópico</span>
        <button type="button" class="btn btn--sm btn--ghost" data-action="removeItem">Remover</button>
      </div>
      <div class="form-group">
        <label class="form-label">Título</label>
        <input type="text" class="form-input" name="topicoTitulo" value="${utils.escapeHtml(data.titulo || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Texto</label>
        <textarea class="form-input" name="topicoTexto" rows="3">${utils.escapeHtml(data.texto || '')}</textarea>
      </div>
      <div class="form-grid form-grid--2">
        <div class="form-group">
          <label class="form-label">Imagem (upload)</label>
          <input type="file" name="topicoImagemFile" accept="image/*" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Ou URL</label>
          <input type="url" class="form-input" name="topicoImagemUrl" value="${utils.escapeHtml(data.imagem || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Créditos da imagem</label>
        <input type="text" class="form-input" name="topicoImagemCreditos" value="${utils.escapeHtml(data.imagem_creditos || '')}" />
      </div>
      <input type="hidden" name="topicoImagemSaved" value="${utils.escapeHtml(data.imagem || '')}" />
    `;
    return div;
  },

  /**
   * Renderiza item de equipe no repeater
   */
  createEquipeItem(data = {}) {
    const div = document.createElement('div');
    div.className = 'repeater-item';
    div.innerHTML = `
      <div class="repeater-item__header">
        <span class="repeater-item__title">Membro</span>
        <button type="button" class="btn btn--sm btn--ghost" data-action="removeItem">Remover</button>
      </div>
      <div class="form-grid form-grid--2">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input type="text" class="form-input" name="equipeNome" value="${utils.escapeHtml(data.nome || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Função</label>
          <input type="text" class="form-input" name="equipeFuncao" value="${utils.escapeHtml(data.funcao || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Link (LinkedIn/WhatsApp/Portfólio)</label>
        <input type="url" class="form-input" name="equipeLink" value="${utils.escapeHtml(data.linkedin || data.link || '')}" />
      </div>
      <div class="form-grid form-grid--2">
        <div class="form-group">
          <label class="form-label">Foto (upload)</label>
          <input type="file" name="equipeFotoFile" accept="image/*" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Foto atual</label>
          ${data.foto || data.foto_url ? 
            `<img src="${utils.escapeHtml(data.foto || data.foto_url)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-md);" />` : 
            '<span class="muted">Sem foto</span>'
          }
        </div>
      </div>
      <input type="hidden" name="equipeFotoSaved" value="${utils.escapeHtml(data.foto || data.foto_url || '')}" />
    `;
    return div;
  },

  /**
   * Preenche formulario de pesquisa
   */
  fillResearchForm(research) {
    const form = document.getElementById('researchForm');
    if (!form) return;
    
    // Campos basicos
    const fields = {
      'cfgSlug': research.slug,
      'cfgTitle': research.titulo,
      'cfgYear': research.ano_base,
      'cfgOrder': research.ordem,
      'cfgStatus': String(research.status ?? true),
      'cfgShortDesc': research.descricao_curta,
      'cfgSynopsis': research.sinopse
    };
    
    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value ?? '';
    });
    
    // Config JSON
    const config = research.config_json || {};
    
    // Resumo e introducao
    const resumo = config.pesquisaResumo || {};
    const intro = resumo.introducao || {};
    const citacao = resumo.citacao || {};
    
    const contentFields = {
      'resumo': resumo.resumo,
      'introTitulo': intro.titulo,
      'introTexto': intro.texto,
      'citacaoTexto': citacao.texto,
      'citacaoAutor': citacao.autor
    };
    
    Object.entries(contentFields).forEach(([name, value]) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = value ?? '';
    });
    
    // Ficha tecnica
    const ficha = config.fichaTecnica || {};
    const teamFields = {
      'realizacaoNome': ficha.realizacao?.nome,
      'financiadorNome': ficha.financiador?.nome,
      'realizacaoLogoUrl': ficha.realizacao?.logo,
      'financiadorLogoUrl': ficha.financiador?.logo,
      'coordenacao': ficha.coordenacao,
      'parceirosApoiadores': ficha.parceirosApoiadores,
      'equipeTexto': ficha.equipeTexto
    };
    
    Object.entries(teamFields).forEach(([name, value]) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = value ?? '';
    });
    
    // Banner
    const bannerUrl = document.getElementById('bannerUrl');
    if (bannerUrl) bannerUrl.value = research.banner_url || '';
    
    // URLs de midia
    const mediaFields = {
      'capaUrl': research.capa_url,
      'relatorioUrl': research.relatorio_pdf_url,
      'relatorioLeituraUrl': research.leitura_url
    };
    
    Object.entries(mediaFields).forEach(([name, value]) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = value ?? '';
    });
    
    // Previews de upload
    const capaPreview = form.querySelector('[data-upload="cover"] .upload-zone__preview');
    if (capaPreview && research.capa_url) {
      capaPreview.src = research.capa_url;
      capaPreview.hidden = false;
    }
    
    // Tópicos
    const topicosList = document.getElementById('topicosList');
    if (topicosList) {
      topicosList.innerHTML = '';
      (resumo.topicos || []).forEach(topico => {
        topicosList.appendChild(ui.createTopicoItem(topico));
      });
    }
    
    // Equipe
    const equipeList = document.getElementById('equipeList');
    if (equipeList) {
      equipeList.innerHTML = '';
      (ficha.equipe || []).forEach(membro => {
        equipeList.appendChild(ui.createEquipeItem(membro));
      });
    }
  },

  /**
   * Coleta dados do formulario
   */
  collectFormData(form) {
    const data = utils.formDataToObject(form);
    
    // Tópicos
    const topicos = [];
    const topicosItems = form.querySelectorAll('#topicosList .repeater-item');
    topicosItems.forEach(item => {
      topicos.push({
        titulo: item.querySelector('[name="topicoTitulo"]')?.value || '',
        texto: item.querySelector('[name="topicoTexto"]')?.value || '',
        imagem: item.querySelector('[name="topicoImagemSaved"]')?.value || item.querySelector('[name="topicoImagemUrl"]')?.value || '',
        imagem_creditos: item.querySelector('[name="topicoImagemCreditos"]')?.value || ''
      });
    });
    
    // Equipe
    const equipe = [];
    const equipeItems = form.querySelectorAll('#equipeList .repeater-item');
    equipeItems.forEach(item => {
      equipe.push({
        nome: item.querySelector('[name="equipeNome"]')?.value || '',
        funcao: item.querySelector('[name="equipeFuncao"]')?.value || '',
        foto: item.querySelector('[name="equipeFotoSaved"]')?.value || '',
        linkedin: item.querySelector('[name="equipeLink"]')?.value || ''
      });
    });
    
    return {
      basic: {
        slug: utils.slugify(data.slug),
        titulo: data.titulo?.trim(),
        ano_base: data.anoBase?.trim() || null,
        ordem: parseInt(data.ordem) || 0,
        status: data.status === 'true',
        descricao_curta: data.descricaoCurta?.trim() || null,
        sinopse: data.sinopse?.trim() || null
      },
      media: {
        capa_url: data.capaUrl?.trim() || null,
        relatorio_pdf_url: data.relatorioUrl?.trim() || null,
        leitura_url: data.relatorioLeituraUrl?.trim() || null,
        banner_url: document.getElementById('bannerUrl')?.value?.trim() || null
      },
      content: {
        resumo: data.resumo?.trim(),
        introTitulo: data.introTitulo?.trim(),
        introTexto: data.introTexto?.trim(),
        citacaoTexto: data.citacaoTexto?.trim(),
        citacaoAutor: data.citacaoAutor?.trim(),
        topicos
      },
      team: {
        realizacaoNome: data.realizacaoNome?.trim(),
        financiadorNome: data.financiadorNome?.trim(),
        realizacaoLogo: data.realizacaoLogoUrl?.trim(),
        financiadorLogo: data.financiadorLogoUrl?.trim(),
        coordenacao: data.coordenacao?.trim(),
        parceirosApoiadores: data.parceirosApoiadores?.trim(),
        equipeTexto: data.equipeTexto?.trim(),
        equipe
      }
    };
  },

  /**
   * Alterna abas do editor
   */
  setEditorTab(tabName) {
    state.activeEditorTab = tabName;
    
    // Atualiza botoes
    document.querySelectorAll('.editor-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.setAttribute('aria-selected', isActive);
      btn.classList.toggle('active', isActive);
    });
    
    // Atualiza paineis
    document.querySelectorAll('.editor__panel').forEach(panel => {
      const isActive = panel.dataset.tabPanel === tabName;
      panel.hidden = !isActive;
    });
  },

  /**
   * Alterna paineis principais
   */
  setMainPanel(panelName) {
    state.activePanel = panelName;
    document.body.setAttribute('data-active-panel', panelName);
    
    // Atualiza navegacao
    document.querySelectorAll('.nav-tab').forEach(btn => {
      const isActive = btn.dataset.tab === panelName;
      btn.setAttribute('aria-selected', isActive);
    });

    document.querySelectorAll('.panel[data-panel]').forEach(panel => {
      panel.hidden = panel.dataset.panel !== panelName;
    });
    
    // Carrega dados do site se necessario
    if (panelName === 'site') {
      handlers.loadSiteConfig();
    }
  },

  /**
   * Mostra/esconde modal de ponto
   */
  togglePointModal(show, pointData = null) {
    const modal = document.getElementById('pointModal');
    if (!modal) return;
    
    modal.hidden = !show;
    document.body.style.overflow = show ? 'hidden' : '';
    
    if (show && pointData) {
      state.editingPoint = pointData;
      
      const fields = {
        'pointId': pointData.id,
        'ptNome': pointData.nome,
        'ptCategoria': pointData.categoria,
        'ptCidade': pointData.cidade,
        'ptUf': pointData.uf,
        'ptLat': pointData.lat,
        'ptLng': pointData.lng,
        'ptDescricao': pointData.descricao,
        'ptSite': pointData.site,
        'ptInstagram': pointData.instagram,
        'ptWhatsapp': pointData.whatsapp,
        'ptEmail': pointData.email,
        'ptAtivo': String(pointData.ativo ?? true)
      };
      
      Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
      });
      
      document.getElementById('pointModalTitle').textContent = 'Editar ponto';
    } else if (show) {
      state.editingPoint = null;
      document.getElementById('pointForm')?.reset();
      document.getElementById('pointId').value = '';
      document.getElementById('pointModalTitle').textContent = 'Novo ponto';
    }
    
    if (!show) {
      state.editingPoint = null;
    }
  },

  /**
   * Mostra overlay de loading
   */
  setLoading(show, text = 'Processando...') {
    state.isLoading = show;
    const overlay = document.getElementById('loadingOverlay');
    const textEl = overlay?.querySelector('.loading-overlay__text');
    
    if (overlay) overlay.hidden = !show;
    if (textEl) textEl.textContent = text;
  },

  /**
   * Atualiza preview de upload
   */
  setUploadPreview(zone, url) {
    if (!zone) return;
    
    const preview = zone.querySelector('.upload-zone__preview');
    if (preview) {
      if (url) {
        preview.src = url;
        preview.hidden = false;
      } else {
        preview.hidden = true;
        preview.removeAttribute('src');
      }
    }
  }
};

// ==========================================
// SECAO 5: EVENT HANDLERS
// ==========================================

const handlers = {
  /**
   * Inicializacao da aplicacao
   */
  async init() {
    // Inicializa Supabase
    const initialized = await api.init();
    
    if (!initialized) {
      const loginError = document.getElementById('loginError');
      utils.showAlert(loginError, 'Erro ao conectar com o servidor. Recarregue a página.', 'error', 0);
      return;
    }
    
    // Verifica sessao existente
    const session = await api.auth.getSession();
    if (session) {
      state.session = session;
      state.user = session.user;
      ui.setAuthState(true);
      await this.loadResearches();
    } else {
      ui.setAuthState(false);
    }
    
    // Observa mudancas de auth
    api.auth.onAuthChange((event, session) => {
      state.session = session;
      state.user = session?.user || null;
      ui.setAuthState(!!session);
      
      if (session) {
        this.loadResearches();
      }
    });
    
    // Bind de eventos
    this.bindEvents();
  },

  /**
   * Bind de todos os eventos
   */
  bindEvents() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    const btnRequestAccess = document.getElementById('btnRequestAccess');
    if (btnRequestAccess) {
      btnRequestAccess.addEventListener('click', () => {
        const loginHelp = document.getElementById('loginHelp');
        utils.setText(loginHelp, 'Entre em contato com o administrador do sistema para solicitar acesso.');
      });
    }
    
    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', this.handleLogout.bind(this));
    }
    
    // Navegacao principal
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const panel = e.currentTarget.dataset.tab;
        ui.setMainPanel(panel);
      });
    });
    
    // Nova pesquisa
    const btnNewResearch = document.getElementById('btnNewResearch');
    if (btnNewResearch) {
      btnNewResearch.addEventListener('click', this.handleNewResearch.bind(this));
    }
    
    // Busca e filtros
    const researchSearch = document.getElementById('researchSearch');
    if (researchSearch) {
      researchSearch.addEventListener('input', utils.debounce(() => {
        state.filters.search = researchSearch.value;
        ui.renderResearchList(state.researches);
      }));
    }
    
    const researchFilter = document.getElementById('researchFilter');
    if (researchFilter) {
      researchFilter.addEventListener('change', () => {
        state.filters.status = researchFilter.value;
        ui.renderResearchList(state.researches);
      });
    }
    
    // Delegacao de eventos na lista de pesquisas
    const researchList = document.getElementById('researchList');
    if (researchList) {
      researchList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        
        if (action === 'select') {
          this.handleSelectResearch(id);
        } else if (action === 'view') {
          this.handleViewResearch(id);
        } else if (action === 'duplicate') {
          this.handleDuplicateResearch(id);
        } else if (action === 'delete') {
          this.handleDeleteResearch(id);
        }
      });
    }
    
    // Abas do editor
    document.querySelectorAll('.editor-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        ui.setEditorTab(e.currentTarget.dataset.tab);
      });
    });

    // Ações locais por bloco/seção
    document.querySelectorAll('.btn-section-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = document.getElementById('researchForm');
        if (!form) return;
        form.requestSubmit();
      });
    });

    document.querySelectorAll('.btn-section-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.currentResearch) return;
        ui.fillResearchForm(state.currentResearch);
        utils.showAlert(document.getElementById('editorAlert'), 'Mudanças locais canceladas.', 'info', 2200);
      });
    });
    
    // Formulario de pesquisa
    const researchForm = document.getElementById('researchForm');
    if (researchForm) {
      researchForm.addEventListener('submit', this.handleSaveResearch.bind(this));
    }
    
    const btnDeleteResearch = document.getElementById('btnDeleteResearch');
    if (btnDeleteResearch) {
      btnDeleteResearch.addEventListener('click', this.handleDeleteCurrentResearch.bind(this));
    }
    
    const btnPreviewPublic = document.getElementById('btnPreviewPublic');
    if (btnPreviewPublic) {
      btnPreviewPublic.addEventListener('click', this.handlePreviewPublic.bind(this));
    }
    
    // Upload zones
    document.querySelectorAll('.upload-zone').forEach(zone => {
      const input = zone.querySelector('input[type="file"]');
      if (!input) return;
      
      zone.addEventListener('click', () => input.click());
      
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length) {
          input.files = files;
          this.handleFileSelect(zone, files[0]);
        }
      });
      
      input.addEventListener('change', (e) => {
        if (e.target.files.length) {
          this.handleFileSelect(zone, e.target.files[0]);
        }
      });
    });
    
    // Salvar banner
    const btnSaveBanner = document.getElementById('btnSaveBanner');
    if (btnSaveBanner) {
      btnSaveBanner.addEventListener('click', this.handleSaveBanner.bind(this));
    }
    
    // Repeater - adicionar tópicos
    const btnAddTopico = document.getElementById('btnAddTopico');
    if (btnAddTopico) {
      btnAddTopico.addEventListener('click', () => {
        const list = document.getElementById('topicosList');
        if (list) list.appendChild(ui.createTopicoItem());
      });
    }
    
    // Repeater - adicionar equipe
    const btnAddEquipe = document.getElementById('btnAddEquipe');
    if (btnAddEquipe) {
      btnAddEquipe.addEventListener('click', () => {
        const list = document.getElementById('equipeList');
        if (list) list.appendChild(ui.createEquipeItem());
      });
    }
    
    // Delegacao para remover items do repeater
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="removeItem"]')) {
        e.target.closest('.repeater-item')?.remove();
      }
    });
    
    // Import CSV
    const csvImport = document.getElementById('csvImport');
    if (csvImport) {
      csvImport.addEventListener('change', this.handleImportCsv.bind(this));
    }
    
    // Busca de pontos
    const pointsSearch = document.getElementById('pointsSearch');
    if (pointsSearch) {
      pointsSearch.addEventListener('input', utils.debounce(() => {
        ui.renderPointsList(state.points);
      }));
    }
    
    // Delegacao na lista de pontos
    const pointsList = document.getElementById('pointsList');
    if (pointsList) {
      pointsList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        
        if (action === 'editPoint') {
          const point = state.points.find(p => p.id === id);
          if (point) ui.togglePointModal(true, point);
        } else if (action === 'deletePoint') {
          this.handleDeletePoint(id);
        }
      });
    }
    
    // Novo ponto
    const btnNewPoint = document.getElementById('btnNewPoint');
    if (btnNewPoint) {
      btnNewPoint.addEventListener('click', () => {
        ui.togglePointModal(true);
      });
    }
    
    // Modal de ponto
    const btnCloseModal = document.getElementById('btnCloseModal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => ui.togglePointModal(false));
    }
    
    const btnCancelModal = document.getElementById('btnCancelModal');
    if (btnCancelModal) {
      btnCancelModal.addEventListener('click', () => ui.togglePointModal(false));
    }
    
    const btnSavePoint = document.getElementById('btnSavePoint');
    if (btnSavePoint) {
      btnSavePoint.addEventListener('click', this.handleSavePoint.bind(this));
    }
    
    // Fechar modal ao clicar no backdrop
    const pointModal = document.getElementById('pointModal');
    if (pointModal) {
      pointModal.addEventListener('click', (e) => {
        if (e.target === pointModal || e.target.classList.contains('modal__backdrop')) {
          ui.togglePointModal(false);
        }
      });
    }
    
    // Configuracoes do site
    const btnSaveHomeBanner = document.getElementById('btnSaveHomeBanner');
    if (btnSaveHomeBanner) {
      btnSaveHomeBanner.addEventListener('click', () => this.handleSaveSiteConfig('home_banner_url', 'homeBannerFile', 'homeBannerUrl', 'homeBannerMsg'));
    }
    
    const btnSaveSiteLogo = document.getElementById('btnSaveSiteLogo');
    if (btnSaveSiteLogo) {
      btnSaveSiteLogo.addEventListener('click', () => this.handleSaveSiteConfig('site_logo_url', 'siteLogoFile', 'siteLogoUrl', 'siteLogoMsg'));
    }
    
    const btnSaveFavicon = document.getElementById('btnSaveFavicon');
    if (btnSaveFavicon) {
      btnSaveFavicon.addEventListener('click', () => this.handleSaveSiteConfig('favicon_url', 'faviconFile', 'faviconUrl', 'faviconMsg'));
    }
  },

  /**
   * Login
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const loginError = document.getElementById('loginError');
    
    const email = form.email.value.trim();
    const password = form.password.value;
    
    if (!email || !password) {
      utils.showAlert(loginError, 'Preencha e-mail e senha', 'error');
      return;
    }
    
    utils.setButtonLoading(btn, true);
    loginError.hidden = true;
    
    try {
      const { user } = await api.auth.signIn(email, password);
      state.user = user;
      ui.setAuthState(true);
      await this.loadResearches();
    } catch (err) {
      console.error('[Login] Error:', err);
      utils.showAlert(loginError, utils.formatError(err), 'error', 0);
    } finally {
      utils.setButtonLoading(btn, false);
    }
  },

  /**
   * Logout
   */
  async handleLogout() {
    try {
      await api.auth.signOut();
      state.session = null;
      state.user = null;
      state.researches = [];
      state.currentResearch = null;
      ui.setAuthState(false);
    } catch (err) {
      console.error('[Logout] Error:', err);
    }
  },

  /**
   * Carrega lista de pesquisas
   */
  async loadResearches() {
    try {
      const researches = await api.researches.list();
      state.researches = researches;
      ui.renderResearchList(researches);
    } catch (err) {
      console.error('[LoadResearches] Error:', err);
    }
  },

  /**
   * Seleciona pesquisa para edicao
   */
  async handleSelectResearch(id) {
    try {
      ui.setLoading(true, 'Carregando pesquisa...');
      
      const research = await api.researches.getById(id);
      if (!research) throw new Error('Pesquisa não encontrada');
      
      state.currentResearch = research;
      
      // Atualiza UI
      document.getElementById('editorEmpty').hidden = true;
      document.getElementById('researchForm').hidden = false;
      document.getElementById('btnDeleteResearch').hidden = false;
      
      // Atualiza titulo
      const editorTitle = document.getElementById('editorTitle');
      if (editorTitle) editorTitle.textContent = research.titulo || 'Editar pesquisa';
      
      // Preenche formulario
      ui.fillResearchForm(research);
      
      // Carrega pontos
      await this.loadPoints(research.id);
      
      // Reseta para primeira aba
      ui.setEditorTab('general');
      
      // Re-renderiza lista para destacar ativo
      ui.renderResearchList(state.researches);

      // Abre editor modular
      ui.setMainPanel('editor');
      
    } catch (err) {
      console.error('[SelectResearch] Error:', err);
      const alert = document.getElementById('editorAlert');
      utils.showAlert(alert, 'Erro ao carregar pesquisa: ' + utils.formatError(err), 'error');
    } finally {
      ui.setLoading(false);
    }
  },

  /**
   * Nova pesquisa
   */
  handleNewResearch() {
    state.currentResearch = null;
    
    // Limpa formulario
    const form = document.getElementById('researchForm');
    if (form) {
      form.reset();
      
      // Limpa campos hidden
      form.querySelectorAll('input[type="hidden"]').forEach(input => {
        input.value = '';
      });
      
      // Limpa previews
      form.querySelectorAll('.upload-zone__preview').forEach(img => {
        img.hidden = true;
        img.removeAttribute('src');
      });
    }
    
    // Limpa repeaters
    const topicosList = document.getElementById('topicosList');
    if (topicosList) topicosList.innerHTML = '';
    
    const equipeList = document.getElementById('equipeList');
    if (equipeList) equipeList.innerHTML = '';
    
    // Limpa pontos
    state.points = [];
    ui.renderPointsList([]);
    ui.renderMap([], '');
    
    // Mostra formulario
    document.getElementById('editorEmpty').hidden = true;
    document.getElementById('researchForm').hidden = false;
    document.getElementById('btnDeleteResearch').hidden = true;
    
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) editorTitle.textContent = 'Nova pesquisa';
    
    // Reseta aba
    ui.setEditorTab('general');
    
    // Remove destaque da lista
    ui.renderResearchList(state.researches);

    // Foca no editor
    ui.setMainPanel('editor');
  },

  /**
   * Visualiza pesquisa publica
   */
  handleViewResearch(id) {
    const research = state.researches.find(r => r.id === id);
    if (!research?.slug) return;
    
    const url = utils.getPublicUrl(research.slug);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Preview publico da pesquisa atual
   */
  handlePreviewPublic() {
    if (!state.currentResearch?.slug) {
      const alert = document.getElementById('editorAlert');
      utils.showAlert(alert, 'Salve a pesquisa primeiro para poder visualizar', 'error');
      return;
    }
    
    const url = utils.getPublicUrl(state.currentResearch.slug);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Duplica pesquisa
   */
  async handleDuplicateResearch(id) {
    const source = state.researches.find(r => r.id === id);
    if (!source) return;
    
    const newSlugBase = `${source.slug || 'pesquisa'}-copia`;
    const newSlug = prompt('Novo slug da cópia:', newSlugBase);
    
    if (!newSlug) return;
    
    const slugClean = utils.slugify(newSlug);
    
    // Verifica se slug ja existe
    if (state.researches.some(r => r.slug === slugClean)) {
      alert('Este slug já existe. Escolha outro.');
      return;
    }
    
    try {
      ui.setLoading(true, 'Duplicando pesquisa...');
      
      const newResearch = await api.researches.duplicate(id, slugClean);
      
      await this.loadResearches();
      
      // Seleciona a nova pesquisa
      await this.handleSelectResearch(newResearch.id);
      
    } catch (err) {
      console.error('[Duplicate] Error:', err);
      alert('Erro ao duplicar: ' + utils.formatError(err));
    } finally {
      ui.setLoading(false);
    }
  },

  /**
   * Exclui pesquisa da lista
   */
  async handleDeleteResearch(id) {
    if (!confirm('Tem certeza que deseja excluir esta pesquisa? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      ui.setLoading(true, 'Excluindo pesquisa...');
      
      await api.researches.delete(id);
      
      // Se estava selecionada, limpa
      if (state.currentResearch?.id === id) {
        state.currentResearch = null;
        document.getElementById('researchForm').hidden = true;
        document.getElementById('editorEmpty').hidden = false;
      }
      
      await this.loadResearches();
      
    } catch (err) {
      console.error('[DeleteResearch] Error:', err);
      alert('Erro ao excluir: ' + utils.formatError(err));
    } finally {
      ui.setLoading(false);
    }
  },

  /**
   * Exclui pesquisa atual (botao no form)
   */
  async handleDeleteCurrentResearch() {
    if (!state.currentResearch?.id) return;
    await this.handleDeleteResearch(state.currentResearch.id);
  },

  /**
   * Salva pesquisa
   */
  async handleSaveResearch(e) {
    e.preventDefault();
    
    const form = e.target;
    const btn = document.getElementById('btnSaveResearch');
    const alert = document.getElementById('editorAlert');
    
    // Validação basica
    const slug = utils.slugify(form.querySelector('[name="slug"]')?.value);
    const titulo = form.querySelector('[name="titulo"]')?.value?.trim();
    
    if (!slug || !titulo) {
      utils.showAlert(alert, 'Slug e título são obrigatórios', 'error');
      return;
    }
    
    utils.setButtonLoading(btn, true);
    
    try {
      // Processa uploads pendentes
      await this.processPendingUploads(form, slug);
      
      // Coleta dados
      const data = ui.collectFormData(form);
      
      // Monta payload
      const configJson = {
        bannerCredito: form.querySelector('[name="bannerCredito"]')?.value?.trim(),
        pesquisaResumo: {
          resumo: data.content.resumo,
          introducao: {
            titulo: data.content.introTitulo,
            texto: data.content.introTexto
          },
          citacao: {
            texto: data.content.citacaoTexto,
            autor: data.content.citacaoAutor
          },
          topicos: data.content.topicos
        },
        fichaTecnica: {
          realizacao: {
            nome: data.team.realizacaoNome,
            logo: data.team.realizacaoLogo
          },
          financiador: {
            nome: data.team.financiadorNome,
            logo: data.team.financiadorLogo
          },
          coordenacao: data.team.coordenacao,
          parceirosApoiadores: data.team.parceirosApoiadores,
          equipeTexto: data.team.equipeTexto,
          equipe: data.team.equipe
        }
      };
      
      const payload = {
        ...data.basic,
        slug: data.basic.slug,
        capa_url: data.media.capa_url,
        relatorio_pdf_url: data.media.relatorio_pdf_url,
        leitura_url: data.media.leitura_url,
        banner_url: data.media.banner_url,
        config_json: configJson
      };
      
      let result;
      
      if (state.currentResearch?.id) {
        // Update
        result = await api.researches.update(state.currentResearch.id, payload);
        utils.showAlert(alert, 'Pesquisa atualizada com sucesso!', 'success');
      } else {
        // Create
        result = await api.researches.create(payload);
        state.currentResearch = result;
        document.getElementById('btnDeleteResearch').hidden = false;
        utils.showAlert(alert, 'Pesquisa criada com sucesso!', 'success');
      }
      
      // Recarrega lista
      await this.loadResearches();
      
    } catch (err) {
      console.error('[SaveResearch] Error:', err);
      utils.showAlert(alert, 'Erro ao salvar: ' + utils.formatError(err), 'error', 0);
    } finally {
      utils.setButtonLoading(btn, false);
    }
  },

  /**
   * Processa uploads pendentes no formulario
   */
  async processPendingUploads(form, slug) {
    const uploads = [];
    
    // Capa
    const capaFile = form.querySelector('[name="capaFile"]')?.files?.[0];
    const capaUrlInput = form.querySelector('[name="capaUrl"]');
    if (capaFile) {
      uploads.push({
        file: capaFile,
        path: `pesquisas/${slug}/capa`,
        input: capaUrlInput
      });
    }
    
    // Relatorio
    const relatorioFile = form.querySelector('[name="relatorioFile"]')?.files?.[0];
    const relatorioUrlInput = form.querySelector('[name="relatorioUrl"]');
    if (relatorioFile) {
      uploads.push({
        file: relatorioFile,
        path: `pesquisas/${slug}/relatorio-${slug}`,
        input: relatorioUrlInput
      });
    }
    
    // Banner
    const bannerFileInput = document.getElementById('bannerFile');
    if (bannerFileInput?.files?.[0]) {
      const bannerUrlInput = document.getElementById('bannerUrl');
      const upload = await api.storage.upload(bannerFileInput.files[0], `pesquisas/${slug}/banner`);
      if (upload && bannerUrlInput) {
        bannerUrlInput.value = upload;
      }
    }
    
    // Logos
    const realizacaoFile = form.querySelector('[name="realizacaoLogoFile"]')?.files?.[0];
    const realizacaoUrlInput = form.querySelector('[name="realizacaoLogoUrl"]');
    if (realizacaoFile) {
      uploads.push({
        file: realizacaoFile,
        path: `pesquisas/${slug}/logos/realizacao`,
        input: realizacaoUrlInput
      });
    }
    
    const financiadorFile = form.querySelector('[name="financiadorLogoFile"]')?.files?.[0];
    const financiadorUrlInput = form.querySelector('[name="financiadorLogoUrl"]');
    if (financiadorFile) {
      uploads.push({
        file: financiadorFile,
        path: `pesquisas/${slug}/logos/financiador`,
        input: financiadorUrlInput
      });
    }
    
    // Tópicos - imagens
    const topicoItems = form.querySelectorAll('#topicosList .repeater-item');
    for (let i = 0; i < topicoItems.length; i++) {
      const fileInput = topicoItems[i].querySelector('[name="topicoImagemFile"]');
      const savedInput = topicoItems[i].querySelector('[name="topicoImagemSaved"]');
      const urlInput = topicoItems[i].querySelector('[name="topicoImagemUrl"]');
      
      if (fileInput?.files?.[0]) {
        const upload = await api.storage.upload(fileInput.files[0], `pesquisas/${slug}/topicos/topico-${i + 1}`);
        if (upload && savedInput) {
          savedInput.value = upload;
        }
      } else if (urlInput?.value && savedInput) {
        savedInput.value = urlInput.value;
      }
    }
    
    // Equipe - fotos
    const equipeItems = form.querySelectorAll('#equipeList .repeater-item');
    for (let i = 0; i < equipeItems.length; i++) {
      const nome = equipeItems[i].querySelector('[name="equipeNome"]')?.value || `membro-${i + 1}`;
      const fileInput = equipeItems[i].querySelector('[name="equipeFotoFile"]');
      const savedInput = equipeItems[i].querySelector('[name="equipeFotoSaved"]');
      
      if (fileInput?.files?.[0]) {
        const safeName = utils.slugify(nome);
        const upload = await api.storage.upload(fileInput.files[0], `pesquisas/${slug}/equipe/${safeName}`);
        if (upload && savedInput) {
          savedInput.value = upload;
        }
      }
    }
    
    // Executa uploads em paralelo
    const results = await Promise.all(
      uploads.map(async ({ file, path, input }) => {
        try {
          const url = await api.storage.upload(file, path);
          if (url && input) input.value = url;
          return { success: true, url };
        } catch (err) {
          console.error(`[Upload] Error for ${path}:`, err);
          return { success: false, error: err };
        }
      })
    );
    
    // Verifica se houve erros
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      throw new Error(`Falha ao enviar ${failures.length} arquivo(s)`);
    }
  },

  /**
   * Handler de selecao de arquivo
   */
  async handleFileSelect(zone, file) {
    // Preview local temporario
    const previewUrl = URL.createObjectURL(file);
    ui.setUploadPreview(zone, previewUrl);
    
    // Limpa URL temporaria apos uso
    zone.dataset.tempUrl = previewUrl;
  },

  /**
   * Salva banner individual
   */
  async handleSaveBanner() {
    if (!state.currentResearch?.id) {
      const msg = document.getElementById('bannerMsg');
      utils.setText(msg, 'Selecione uma pesquisa primeiro');
      return;
    }
    
    const bannerFile = document.getElementById('bannerFile')?.files?.[0];
    const bannerUrl = document.getElementById('bannerUrl')?.value?.trim();
    const msgEl = document.getElementById('bannerMsg');
    
    if (!bannerFile && !bannerUrl) {
      utils.setText(msgEl, 'Selecione um arquivo ou informe uma URL');
      return;
    }
    
    try {
      let finalUrl = bannerUrl;
      
      if (bannerFile) {
        const slug = state.currentResearch.slug;
        finalUrl = await api.storage.upload(bannerFile, `pesquisas/${slug}/banner`);
      }
      
      await api.researches.update(state.currentResearch.id, { banner_url: finalUrl });
      
      utils.setText(msgEl, 'Banner salvo com sucesso!');
      setTimeout(() => utils.setText(msgEl, ''), 3000);
      
    } catch (err) {
      utils.setText(msgEl, 'Erro: ' + utils.formatError(err));
    }
  },

  /**
   * Carrega pontos da pesquisa
   */
  async loadPoints(researchId) {
    try {
      const points = await api.points.listByResearch(researchId);
      state.points = points;
      ui.renderPointsList(points);
      
      const slug = state.currentResearch?.slug || '';
      ui.renderMap(points, slug);
      
    } catch (err) {
      console.error('[LoadPoints] Error:', err);
    }
  },

  /**
   * Importa CSV de pontos
   */
  async handleImportCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!state.currentResearch?.id) {
      alert('Salve a pesquisa antes de importar pontos');
      e.target.value = '';
      return;
    }
    
    try {
      ui.setLoading(true, 'Processando CSV...');
      
      const text = await file.text();
      const rows = this.parseCsv(text);
      
      // Mostra preview
      const previewContainer = document.getElementById('csvPreview');
      const previewMeta = document.getElementById('csvPreviewMeta');
      const previewList = document.getElementById('csvPreviewList');
      
      if (previewContainer) previewContainer.hidden = false;
      if (previewMeta) previewMeta.textContent = `${rows.length} linhas encontradas`;
      
      if (previewList) {
        previewList.innerHTML = rows.slice(0, 10).map((row, i) => `
          <div class="csv-preview-item">
            <strong>${utils.escapeHtml(row.nome || 'Sem nome')}</strong>
            <div class="muted">${utils.escapeHtml(row.cidade || '')} ${row.uf || ''} • ${utils.escapeHtml(row.categoria || '')}</div>
          </div>
        `).join('');
        
        if (rows.length > 10) {
          previewList.innerHTML += `<div class="muted" style="text-align: center; padding: 8px;">...e mais ${rows.length - 10} pontos</div>`;
        }
      }
      
      // Confirma importacao
      if (!confirm(`Importar ${rows.length} pontos? Isso substituirá os pontos existentes.`)) {
        e.target.value = '';
        ui.setLoading(false);
        return;
      }
      
      // Prepara payload
      const payload = rows.map(r => ({
        pesquisa_id: state.currentResearch.id,
        nome: r.nome?.trim(),
        cidade: r.cidade?.trim(),
        uf: r.uf?.trim().toUpperCase(),
        categoria: r.categoria?.trim(),
        lat: utils.toNumber(r.lat),
        lng: utils.toNumber(r.lng),
        descricao: r.descricao?.trim(),
        site: r.site?.trim(),
        instagram: r.instagram?.trim(),
        facebook: r.facebook?.trim(),
        whatsapp: r.whatsapp?.trim(),
        email: r.email?.trim(),
        ativo: true
      })).filter(r => r.nome);
      
      // Limpa pontos antigos e insere novos
      await api.points.deleteByResearch(state.currentResearch.id);
      await api.points.batchInsert(payload);
      
      // Recarrega
      await this.loadPoints(state.currentResearch.id);
      
      // Salva URL do CSV se possivel
      try {
        const csvUrl = await api.storage.upload(file, `pesquisas/${state.currentResearch.slug}/mapa`);
        if (csvUrl) {
          await api.researches.update(state.currentResearch.id, { csv_fallback: csvUrl });
        }
      } catch (err) {
        console.warn('[CSV] Failed to save CSV to storage:', err);
      }
      
      utils.showAlert(document.getElementById('editorAlert'), `${payload.length} pontos importados com sucesso!`, 'success');
      
    } catch (err) {
      console.error('[ImportCsv] Error:', err);
      alert('Erro ao importar CSV: ' + utils.formatError(err));
    } finally {
      ui.setLoading(false);
      e.target.value = '';
    }
  },

  /**
   * Parser de CSV
   */
  parseCsv(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    
    const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
    
    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return this.normalizeCsvRow(obj);
    });
  },

  /**
   * Normaliza dados do CSV
   */
  normalizeCsvRow(row) {
    const getValue = (keys) => {
      for (const key of keys) {
        if (row[key] !== undefined) return row[key];
      }
      return '';
    };
    
    return {
      nome: getValue(['nome', 'name', 'participante', 'titulo']),
      categoria: getValue(['categoria', 'category', 'tipo']),
      cidade: getValue(['cidade', 'city', 'municipio']),
      uf: getValue(['uf', 'estado', 'state']),
      lat: getValue(['lat', 'latitude', 'y']),
      lng: getValue(['lng', 'lon', 'longitude', 'long', 'x']),
      descricao: getValue(['descricao', 'description', 'sobre']),
      site: getValue(['site', 'website', 'url']),
      instagram: getValue(['instagram', 'ig']),
      facebook: getValue(['facebook', 'fb']),
      whatsapp: getValue(['whatsapp', 'telefone', 'tel', 'phone']),
      email: getValue(['email', 'e-mail', 'mail'])
    };
  },

  /**
   * Salva ponto (modal)
   */
  async handleSavePoint() {
    if (!state.currentResearch?.id) {
      const msg = document.getElementById('modalMsg');
      utils.setText(msg, 'Selecione uma pesquisa primeiro');
      return;
    }
    
    const btn = document.getElementById('btnSavePoint');
    const msg = document.getElementById('modalMsg');
    
    const data = {
      nome: document.getElementById('ptNome')?.value?.trim(),
      categoria: document.getElementById('ptCategoria')?.value?.trim(),
      cidade: document.getElementById('ptCidade')?.value?.trim(),
      uf: document.getElementById('ptUf')?.value?.trim().toUpperCase(),
      lat: utils.toNumber(document.getElementById('ptLat')?.value),
      lng: utils.toNumber(document.getElementById('ptLng')?.value),
      descricao: document.getElementById('ptDescricao')?.value?.trim(),
      site: document.getElementById('ptSite')?.value?.trim(),
      instagram: document.getElementById('ptInstagram')?.value?.trim(),
      whatsapp: document.getElementById('ptWhatsapp')?.value?.trim(),
      email: document.getElementById('ptEmail')?.value?.trim(),
      ativo: document.getElementById('ptAtivo')?.value === 'true'
    };
    
    if (!data.nome) {
      utils.setText(msg, 'Nome é obrigatório');
      return;
    }
    
    utils.setButtonLoading(btn, true);
    utils.setText(msg, '');
    
    try {
      if (state.editingPoint?.id) {
        // Update
        await api.points.update(state.editingPoint.id, data);
      } else {
        // Create
        await api.points.create({
          ...data,
          pesquisa_id: state.currentResearch.id
        });
      }
      
      // Recarrega pontos
      await this.loadPoints(state.currentResearch.id);
      
      ui.togglePointModal(false);
      
    } catch (err) {
      console.error('[SavePoint] Error:', err);
      utils.setText(msg, 'Erro: ' + utils.formatError(err));
    } finally {
      utils.setButtonLoading(btn, false);
    }
  },

  /**
   * Exclui ponto
   */
  async handleDeletePoint(id) {
    if (!confirm('Excluir este ponto?')) return;
    
    try {
      await api.points.delete(id);
      
      // Remove do estado local
      state.points = state.points.filter(p => p.id !== id);
      ui.renderPointsList(state.points);
      ui.renderMap(state.points, state.currentResearch?.slug || '');
      
    } catch (err) {
      console.error('[DeletePoint] Error:', err);
      alert('Erro ao excluir ponto: ' + utils.formatError(err));
    }
  },

  /**
   * Carrega configuracoes do site
   */
  async loadSiteConfig() {
    try {
      const [logoUrl, bannerUrl, faviconUrl] = await Promise.all([
        api.site.getConfig('site_logo_url'),
        api.site.getConfig('home_banner_url'),
        api.site.getConfig('favicon_url')
      ]);
      
      // Preenche campos
      const logoInput = document.getElementById('siteLogoUrl');
      const bannerInput = document.getElementById('homeBannerUrl');
      const faviconInput = document.getElementById('faviconUrl');
      
      if (logoInput) logoInput.value = logoUrl;
      if (bannerInput) bannerInput.value = bannerUrl;
      if (faviconInput) faviconInput.value = faviconUrl;
      
      // Previews
      if (logoUrl) {
        const logoZone = document.querySelector('[data-upload="siteLogo"]');
        ui.setUploadPreview(logoZone, logoUrl);
      }
      
      if (bannerUrl) {
        const bannerZone = document.querySelector('[data-upload="homeBanner"]');
        ui.setUploadPreview(bannerZone, bannerUrl);
      }
      
      if (faviconUrl) {
        const faviconZone = document.querySelector('[data-upload="favicon"]');
        ui.setUploadPreview(faviconZone, faviconUrl);
      }
      
      // Atualiza logos na interface
      this.updateBrandLogos(logoUrl, bannerUrl);
      
    } catch (err) {
      console.error('[LoadSiteConfig] Error:', err);
    }
  },

  /**
   * Salva configuracao do site
   */
  async handleSaveSiteConfig(key, fileInputId, urlInputId, msgId) {
    const fileInput = document.getElementById(fileInputId);
    const urlInput = document.getElementById(urlInputId);
    const msgEl = document.getElementById(msgId);
    
    const file = fileInput?.files?.[0];
    const url = urlInput?.value?.trim();
    
    if (!file && !url) {
      utils.setText(msgEl, 'Selecione um arquivo ou informe uma URL');
      return;
    }
    
    try {
      let finalUrl = url;
      
      if (file) {
        const path = key.replace(/_url$/, '').replace(/_/g, '-');
        finalUrl = await api.storage.upload(file, `site/${path}`);
      }
      
      await api.site.setConfig(key, finalUrl);
      
      utils.setText(msgEl, 'Salvo com sucesso!');
      setTimeout(() => utils.setText(msgEl, ''), 3000);
      
      // Recarrega para atualizar previews
      await this.loadSiteConfig();
      
      // Limpa input de arquivo
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error(`[SaveSiteConfig] Error for ${key}:`, err);
      utils.setText(msgEl, 'Erro: ' + utils.formatError(err));
    }
  },

  /**
   * Atualiza logos na marca da interface
   */
  updateBrandLogos(logoUrl, bannerUrl) {
    // Login
    const loginLogo = document.getElementById('loginLogo');
    if (loginLogo && logoUrl) {
      loginLogo.src = logoUrl;
      loginLogo.hidden = false;
    }
    
    // Dashboard
    const dashboardLogo = document.getElementById('dashboardLogo');
    if (dashboardLogo && logoUrl) {
      dashboardLogo.src = logoUrl;
      dashboardLogo.hidden = false;
    }
    
    const navLogo = document.getElementById('navLogo');
    if (navLogo && logoUrl) {
      navLogo.src = logoUrl;
      navLogo.hidden = false;
    }
    
    // Backgrounds
    const loginBg = document.getElementById('loginBg');
    if (loginBg && bannerUrl) {
      loginBg.style.backgroundImage = `url("${bannerUrl}")`;
    }
    
    const dashboardBg = document.getElementById('dashboardBg');
    if (dashboardBg && bannerUrl) {
      dashboardBg.style.backgroundImage = `url("${bannerUrl}")`;
    }
  }
};

// ==========================================
// SECAO 6: INICIALIZACAO
// ==========================================

// Inicia aplicacao quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => handlers.init());
} else {
  handlers.init();
}

// Expoe para debug (remover em producao)
window.AdminV6 = { state, api, ui, utils, handlers };
