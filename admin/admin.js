const state = {
  supabase: null,
  session: null,
  pesquisas: [],
  current: null,
  pontos: [],
  editingPonto: null
};

let currentResearchId = null;
let researchCache = [];

const els = {
  loginPanel: document.getElementById("login-panel"),
  loginForm: document.getElementById("login-form"),
  loginError: document.getElementById("login-error"),
  adminPanel: document.getElementById("admin-panel"),
  user: document.getElementById("admin-user"),
  logout: document.getElementById("btn-logout"),
  list: document.getElementById("researchList"),
  listMsg: document.getElementById("researchListMsg"),
  newBtn: document.getElementById("btn-new"),
  seedBtn: document.getElementById("btnSeedTests"),
  diagBtn: document.getElementById("btnDiag"),
  writeTestBtn: document.getElementById("btnWriteTest"),
  form: document.getElementById("pesquisa-form"),
  formTitle: document.getElementById("form-title"),
  deleteBtn: document.getElementById("btn-delete"),
  emptyState: document.getElementById("empty-state"),
  topicosList: document.getElementById("topicos-list"),
  addTopico: document.getElementById("add-topico"),
  equipeList: document.getElementById("equipe-list"),
  addEquipe: document.getElementById("add-equipe"),
  capaPreview: document.getElementById("capa-preview"),
  tabs: document.querySelectorAll(".tab"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
  pontosList: document.getElementById("pontos-list"),
  pontoForm: document.getElementById("ponto-form"),
  pontoFormTitle: document.getElementById("ponto-form-title"),
  pontoDelete: document.getElementById("ponto-delete"),
  importCsv: document.getElementById("import-csv")
};

function $(id){
  return document.getElementById(id);
}

function setSaveMsg(text, ok = false){
  const el = $("saveMsg");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#198754" : "#6b7a75";
}

function adminMsg(text, type = "muted"){
  const el = document.getElementById("adminMsg");
  if (!el) return;
  el.className = `admin-msg ${type}`;
  el.textContent = text || "";
}

function formatSupabaseError(error){
  if (!error) return "Erro desconhecido.";
  const parts = [];
  const message = error.message || String(error);
  if (message) parts.push(message);
  if (error.details) parts.push(`Detalhes: ${error.details}`);
  if (error.hint) parts.push(`Dica: ${error.hint}`);
  if (error.code) parts.push(`Código: ${error.code}`);
  if (error.status) parts.push(`Status: ${error.status}`);

  let msg = parts.join(" ");
  const lower = msg.toLowerCase();
  if (isRlsError(error, lower)) {
    msg += " Possível bloqueio de RLS/permissão. Verifique as policies da tabela public.pesquisas (arquivo supabase-admin-policies.sql).";
  }
  if (lower.includes("column") || lower.includes("schema cache") || lower.includes("unknown column")) {
    msg += " Verifique se as colunas esperadas existem (slug, titulo, ano_base, ordem, status, config_json).";
  }
  return msg;
}

function normalizeSlug(value){
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");
}

const diag = document.createElement("div");
diag.style.marginTop = "10px";
diag.style.fontSize = "12px";
diag.style.color = "#95a4c4";
diag.id = "sbDiag";
els.loginPanel?.appendChild(diag);

init();

async function init(){
  state.supabase = await getSupabaseClient();
  if (!state.supabase || !window.__SUPABASE_CONFIG_OK__) {
    els.loginError.textContent = "Supabase não configurado. Crie o arquivo js/supabase-config.js.";
    setDiag("Supabase não configurado: confira /js/supabase-config.js e caminhos no /admin/index.html");
    els.loginForm.querySelector("button").disabled = true;
    return;
  }
  setDiag(`Supabase Client OK: ${window.SUPABASE_URL || "configurado"}`);

  const { data } = await state.supabase.auth.getSession();
  setSession(data?.session ?? null);

  state.supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  els.loginForm.addEventListener("submit", handleLogin);
  els.logout.addEventListener("click", handleLogout);
  els.newBtn.addEventListener("click", () => clearForm());
  els.seedBtn?.addEventListener("click", handleSeedTests);
  els.diagBtn?.addEventListener("click", runDiag);
  els.writeTestBtn?.addEventListener("click", handleWriteTest);
  els.form.addEventListener("submit", handleSavePesquisa);
  els.deleteBtn.addEventListener("click", handleDeletePesquisa);
  els.addTopico.addEventListener("click", () => addTopicoItem());
  els.addEquipe.addEventListener("click", () => addEquipeItem());
  els.pontoForm.addEventListener("submit", handleSavePonto);
  els.pontoDelete.addEventListener("click", handleDeletePonto);
  els.importCsv.addEventListener("change", handleImportCsv);

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });
}

function setDiag(msg){
  const el = document.getElementById("sbDiag");
  if (el) el.textContent = msg;
}

function setDiagStatus(text){
  const el = document.getElementById("diagStatus");
  if (el) el.textContent = text || "";
}

function setDiagOut(obj){
  const el = document.getElementById("diagOut");
  if (!el) return;
  el.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

function errToObj(error){
  if (!error) return { error: "unknown" };
  if (typeof error === "string") return { message: error };
  return {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    status: error.status,
    name: error.name
  };
}

function isRlsError(error, lowerMsg){
  const lower = lowerMsg ?? String(error?.message || "").toLowerCase();
  return error?.code === "42501" || error?.status === 401 || error?.status === 403 || lower.includes("permission") || lower.includes("rls");
}

function getRlsHint(error){
  if (!isRlsError(error)) return null;
  return "Possível bloqueio de RLS. Rode o SQL em supabase-admin-policies.sql para liberar INSERT/UPDATE/DELETE para usuários autenticados.";
}

async function getSupabaseClient(){
  const loader = window.__SUPABASE_CONFIG_LOADED__;
  if (loader && typeof loader.then === "function") {
    try {
      await loader;
    } catch (error) {
      console.warn("[Supabase] Falha ao carregar supabase-config.js", error);
    }
  }

  if (!window.supabaseClient) {
    console.warn("[Supabase] Client indisponível.");
  }

  return window.supabaseClient || null;
}

function createEmptyPesquisa(){
  return {
    slug: "",
    titulo: "",
    ano_base: "",
    descricao_curta: "",
    sinopse: "",
    status: true,
    ordem: 0,
    csv_fallback: "",
    capa_url: "",
    relatorio_pdf_url: "",
    leitura_url: "",
    config_json: {
      mapa: {},
      pesquisaResumo: {},
      fichaTecnica: {}
    }
  };
}

function buildSeedRows(){
  const resumoBase = (citacaoTexto) => ({
    introducao: {
      titulo: "Introdução",
      texto: "Conteúdo de teste para validar a página da pesquisa."
    },
    citacao: {
      texto: citacaoTexto,
      autor: "— Teste"
    },
    topicos: Array.from({ length: 10 }, (_, i) => ({
      titulo: `Tópico ${i + 1}`,
      texto: `Texto do tópico ${i + 1} (teste).`,
      imagemKey: `pesquisa.img.${i + 1}`
    }))
  });

  const fichaBase = (funcao3) => ({
    realizacao: { nome: "Instituto Sumaúma", logoKey: "ficha.realizacao.logo" },
    financiador: { nome: "Financiador (Teste)", logoKey: "ficha.financiador.logo" },
    equipe: [
      { nome: "Pessoa 1", funcao: "Coordenação", fotoKey: "ficha.equipe.1" },
      { nome: "Pessoa 2", funcao: "Pesquisa", fotoKey: "ficha.equipe.2" },
      { nome: "Pessoa 3", funcao: funcao3, fotoKey: "ficha.equipe.3" }
    ]
  });

  return [
    {
      slug: "seguimento-negro",
      titulo: "Seguimento Negro",
      ano_base: "2025",
      ordem: 1,
      descricao_curta: "Pesquisa teste sobre articulações e dinâmicas do seguimento negro no território.",
      sinopse: "Relatório (teste) — seed para validar o portal multi-pesquisas.",
      status: true,
      csv_fallback: "/public/data/mapeamento-seguimento-negro.csv",
      capa_url: "https://placehold.co/1200x400/png?text=Seguimento+Negro+-+Capa",
      relatorio_pdf_url: "https://example.com/relatorio-seguimento-negro.pdf",
      leitura_url: null,
      config_json: {
        pesquisaResumo: resumoBase("A ancestralidade é caminho e presença."),
        fichaTecnica: fichaBase("Design")
      }
    },
    {
      slug: "territorios-quilombolas",
      titulo: "Territórios Quilombolas",
      ano_base: "2025",
      ordem: 2,
      descricao_curta: "Pesquisa teste sobre territórios quilombolas e conexões culturais e comunicacionais.",
      sinopse: "Relatório (teste) — seed para validar o portal multi-pesquisas.",
      status: true,
      csv_fallback: "/public/data/mapeamento-territorios-quilombolas.csv",
      capa_url: "https://placehold.co/1200x400/png?text=Territorios+Quilombolas+-+Capa",
      relatorio_pdf_url: "https://example.com/relatorio-territorios-quilombolas.pdf",
      leitura_url: null,
      config_json: {
        pesquisaResumo: resumoBase("Território é memória viva e futuro em construção."),
        fichaTecnica: fichaBase("Comunicação")
      }
    }
  ];
}

async function handleSeedTests(){
  if (!state.supabase) return;
  if (!state.session) {
    setSaveMsg("Faça login para criar pesquisas teste.");
    adminMsg("Faça login para criar pesquisas teste.", "err");
    return;
  }
  try {
    setSaveMsg("Criando pesquisas teste...");
    adminMsg("Criando pesquisas teste...", "muted");
    const rows = buildSeedRows();
    const { error } = await state.supabase
      .from("pesquisas")
      .upsert(rows, { onConflict: "slug" });
    if (error) throw error;
    await refreshListAndSelect(null);
    setSaveMsg("Pesquisas teste criadas ✅", true);
    adminMsg("Pesquisas teste criadas ✅", "ok");
  } catch (error) {
    console.error(error);
    const msg = `Erro seed: ${formatSupabaseError(error)}`;
    setSaveMsg(msg);
    adminMsg(msg, "err");
  }
}

function setSession(session){
  state.session = session;
  const loggedIn = !!session;
  els.loginPanel.classList.toggle("hidden", loggedIn);
  els.adminPanel.classList.toggle("hidden", !loggedIn);
  els.logout.classList.toggle("hidden", !loggedIn);
  els.user.textContent = session?.user?.email || "";
  if (loggedIn) {
    refreshListAndSelect(null);
  }
}

async function handleLogin(e){
  e.preventDefault();
  els.loginError.textContent = "";
  if (!state.supabase || !window.__SUPABASE_CONFIG_OK__) {
    setDiag("Supabase não configurado: confira /js/supabase-config.js e caminhos no /admin/index.html");
    return;
  }
  const formData = new FormData(els.loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[Login] erro:", error);
    const status = error.status ? ` (status ${error.status})` : "";
    els.loginError.textContent = `${error.message}${status}`;
    setDiag(`Falha login: ${error.message}`);
    return;
  }
  setDiag("Login OK: sessão ativa.");
  const sess = await state.supabase.auth.getSession();
  console.log("[Session]", sess);
}

async function handleLogout(){
  await state.supabase.auth.signOut();
}

async function listResearches(){
  const { data, error } = await state.supabase
    .from("pesquisas")
    .select("id,slug,titulo,ano_base,ordem,descricao_curta,sinopse,status,csv_fallback,capa_url,relatorio_pdf_url,leitura_url,config_json,updated_at")
    .order("ordem", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  researchCache = data || [];
  return researchCache;
}

function renderResearchList(rows){
  if (!els.list) return;
  if (!rows.length) {
    els.list.innerHTML = "";
    if (els.listMsg) els.listMsg.textContent = "Nenhuma pesquisa cadastrada ainda.";
    return;
  }

  if (els.listMsg) els.listMsg.textContent = "";
  els.list.innerHTML = rows.map((pesquisa) => {
    const badgeClass = pesquisa.status ? "" : "off";
    const badgeText = pesquisa.status ? "Publicado" : "Rascunho";
    const activeClass = currentResearchId === pesquisa.id ? " active" : "";
    return `
      <div class="r-item${activeClass}" data-id="${pesquisa.id}">
        <div class="r-top">
          <div>
            <div class="r-title">${escapeHtml(pesquisa.titulo || "(Sem título)")}</div>
            <div class="r-slug">/${escapeHtml(pesquisa.slug || "")}</div>
          </div>
          <div class="r-badge ${badgeClass}">${badgeText}</div>
        </div>
        <div class="r-actions">
          <button class="btn-mini primary" data-act="edit" data-id="${pesquisa.id}">Editar</button>
          <button class="btn-mini" data-act="dup" data-id="${pesquisa.id}">Duplicar</button>
          <button class="btn-mini danger" data-act="del" data-id="${pesquisa.id}">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

function showForm(){
  els.form.classList.remove("hidden");
  els.emptyState.classList.add("hidden");
}

function clearForm(){
  const empty = createEmptyPesquisa();
  state.current = null;
  currentResearchId = null;
  state.editingPonto = null;
  showForm();
  els.formTitle.textContent = "Nova pesquisa";
  els.deleteBtn.classList.add("hidden");
  fillForm(empty);
  setTab("conteudo");
  loadPontos();
  setSaveMsg("");
  adminMsg("");
}

function loadResearchToForm(pesquisa){
  state.current = pesquisa;
  currentResearchId = pesquisa?.id || null;
  state.editingPonto = null;
  showForm();
  els.formTitle.textContent = pesquisa?.id ? "Editar pesquisa" : "Nova pesquisa";
  els.deleteBtn.classList.toggle("hidden", !pesquisa?.id);
  fillForm(pesquisa);
  setTab("conteudo");
  loadPontos();
  setSaveMsg(pesquisa?.id ? `Editando: ${pesquisa.slug || ""}` : "", true);
  adminMsg(pesquisa?.id ? `Editando: ${pesquisa.slug || ""}` : "", "muted");
}

async function refreshListAndSelect(selectId = null){
  try {
    const rows = await listResearches();
    renderResearchList(rows);
    if (selectId) {
      const selected = rows.find((row) => String(row.id) === String(selectId));
      if (selected) loadResearchToForm(selected);
    } else if (currentResearchId) {
      const selected = rows.find((row) => String(row.id) === String(currentResearchId));
      if (selected) loadResearchToForm(selected);
    } else {
      els.form.classList.add("hidden");
      els.emptyState.classList.remove("hidden");
    }
  } catch (error) {
    console.error(error);
    const msg = `Erro ao carregar pesquisas: ${formatSupabaseError(error)}`;
    setSaveMsg(msg);
    adminMsg(msg, "err");
  }
}

function fillForm(pesquisa){
  const cfg = pesquisa.config_json || {};
  const ficha = cfg.fichaTecnica || {};
  const resumo = cfg.pesquisaResumo || {};
  const mapa = cfg.mapa || {};

  setValue("slug", pesquisa.slug || "");
  setValue("titulo", pesquisa.titulo || "");
  setValue("anoBase", pesquisa.ano_base || "");
  setValue("ordem", pesquisa.ordem ?? 0);
  setValue("descricaoCurta", pesquisa.descricao_curta || "");
  setValue("sinopse", pesquisa.sinopse || "");
  setValue("status", String(pesquisa.status ?? true));
  setValue("csvUrl", pesquisa.csv_fallback || mapa.csvUrl || "");
  setValue("capaUrl", pesquisa.capa_url || cfg.capa || "");
  setValue("relatorioUrl", pesquisa.relatorio_pdf_url || cfg.relatorioPdf || "");
  setValue("relatorioLeituraUrl", pesquisa.leitura_url || cfg.relatorioLeituraUrl || "");
  setValue("relatorioUrlConfirm", pesquisa.relatorio_pdf_url || cfg.relatorioPdf || "");
  setValue("relatorioLeituraUrlConfirm", pesquisa.leitura_url || cfg.relatorioLeituraUrl || "");

  els.capaPreview.src = pesquisa.capa_url || cfg.capa || "";
  els.capaPreview.classList.toggle("hidden", !els.capaPreview.src);

  setValue("introTitulo", resumo.introducao?.titulo || "");
  setValue("introTexto", resumo.introducao?.texto || "");
  setValue("citacaoTexto", resumo.citacao?.texto || "");
  setValue("citacaoAutor", resumo.citacao?.autor || "");

  setValue("realizacaoNome", ficha.realizacao?.nome || "");
  setValue("realizacaoLogoUrl", ficha.realizacao?.logo || "");
  setValue("financiadorNome", ficha.financiador?.nome || "");
  setValue("financiadorLogoUrl", ficha.financiador?.logo || "");

  renderTopicos(resumo.topicos || []);
  renderEquipe(ficha.equipe || []);
}

function setValue(name, value){
  const input = els.form.querySelector(`[name="${name}"]`);
  if (input) input.value = value ?? "";
}

function renderTopicos(topicos){
  els.topicosList.innerHTML = "";
  topicos.forEach((topico) => addTopicoItem(topico));
}

function addTopicoItem(topico = {}){
  const wrapper = document.createElement("div");
  wrapper.className = "repeater-item";
  wrapper.dataset.topic = "1";
  wrapper.innerHTML = `
    <label>Título<input type="text" name="topicoTitulo" value="${escapeHtml(topico.titulo || "")}" /></label>
    <label>Texto<textarea name="topicoTexto" rows="2">${escapeHtml(topico.texto || "")}</textarea></label>
    <label>Imagem<input type="file" name="topicoImagemFile" accept="image/*" />
      <input type="text" name="topicoImagemUrl" value="${escapeHtml(topico.imagem || "")}" placeholder="URL da imagem" />
    </label>
    <button class="btn light" type="button" data-remove="1">Remover</button>
  `;
  wrapper.querySelector("[data-remove]").addEventListener("click", () => wrapper.remove());
  els.topicosList.appendChild(wrapper);
}

function renderEquipe(equipe){
  els.equipeList.innerHTML = "";
  equipe.forEach((membro) => addEquipeItem(membro));
}

function addEquipeItem(membro = {}){
  const wrapper = document.createElement("div");
  wrapper.className = "repeater-item";
  wrapper.dataset.equipe = "1";
  wrapper.innerHTML = `
    <label>Nome<input type="text" name="equipeNome" value="${escapeHtml(membro.nome || "")}" /></label>
    <label>Função<input type="text" name="equipeFuncao" value="${escapeHtml(membro.funcao || "")}" /></label>
    <label>Foto<input type="file" name="equipeFotoFile" accept="image/*" />
      <input type="text" name="equipeFotoUrl" value="${escapeHtml(membro.foto || "")}" placeholder="URL da foto" />
    </label>
    <button class="btn light" type="button" data-remove="1">Remover</button>
  `;
  wrapper.querySelector("[data-remove]").addEventListener("click", () => wrapper.remove());
  els.equipeList.appendChild(wrapper);
}

async function handleSavePesquisa(e){
  e.preventDefault();
  if (!state.supabase) return;

  try {
    const isNew = !currentResearchId;
    setSaveMsg("Salvando...");
    adminMsg("Salvando...", "muted");
    await saveResearch();
    setSaveMsg(isNew ? "Pesquisa criada ✅" : "Pesquisa atualizada ✅", true);
    adminMsg(isNew ? "Criada ✅" : "Atualizada ✅", "ok");
  } catch (error) {
    console.error(error);
    const msg = `Erro ao salvar: ${formatSupabaseError(error)}`;
    setSaveMsg(msg);
    adminMsg(msg, "err");
    setDiagStatus("ERRO ao salvar");
    setDiagOut({ action: "save", error: errToObj(error), hint: getRlsHint(error) });
  }
}

async function saveResearch(){
  const client = window.supabaseClient;
  if (!client) throw new Error("Supabase client ausente.");

  const payload = await readFormToPayload();
  setDiagStatus("Salvando...");
  setDiagOut({ action: "save", id: currentResearchId, payload });

  if (!currentResearchId) {
    const res = await client.from("pesquisas").insert(payload).select("id").single();
    if (res.error) {
      setDiagStatus("ERRO ao criar");
      setDiagOut({ action: "insert", error: errToObj(res.error), hint: getRlsHint(res.error) });
      throw res.error;
    }
    currentResearchId = res.data.id;
    setDiagStatus("Criada ✅");
  } else {
    const res = await client.from("pesquisas").update(payload).eq("id", currentResearchId);
    if (res.error) {
      setDiagStatus("ERRO ao atualizar");
      setDiagOut({ action: "update", id: currentResearchId, error: errToObj(res.error), hint: getRlsHint(res.error) });
      throw res.error;
    }
    setDiagStatus("Atualizada ✅");
  }

  await refreshListAndSelect(currentResearchId);
}

async function handleDeletePesquisa(){
  if (!currentResearchId) return;
  if (!confirm("Excluir esta pesquisa?")) return;
  try {
    setSaveMsg("Excluindo...");
    adminMsg("Excluindo...", "muted");
    await deleteResearch(currentResearchId);
    currentResearchId = null;
    state.current = null;
    await refreshListAndSelect(null);
    setSaveMsg("Excluída ✅", true);
    adminMsg("Excluída ✅", "ok");
  } catch (error) {
    console.error(error);
    const msg = `Erro ao excluir: ${formatSupabaseError(error)}`;
    setSaveMsg(msg);
    adminMsg(msg, "err");
  }
}

async function createResearch(payload){
  const { data, error } = await state.supabase
    .from("pesquisas")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function updateResearch(id, payload){
  const { error } = await state.supabase
    .from("pesquisas")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

async function deleteResearch(id){
  const { error } = await state.supabase
    .from("pesquisas")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

async function duplicateResearch(id){
  const src = researchCache.find((row) => String(row.id) === String(id));
  if (!src) throw new Error("Pesquisa não encontrada no cache.");

  const newSlugBase = `${src.slug || "pesquisa"}-copia`;
  const newSlug = normalizeSlug(prompt("Novo slug da cópia:", newSlugBase) || "");
  if (!newSlug) throw new Error("Slug da cópia é obrigatório.");
  if (researchCache.some((row) => row.slug === newSlug)) {
    throw new Error("Slug já existe.");
  }

  const payload = {
    slug: newSlug,
    titulo: `${src.titulo || ""} (Cópia)`.trim(),
    ano_base: src.ano_base || null,
    ordem: (src.ordem ?? 0) + 1,
    descricao_curta: src.descricao_curta || null,
    sinopse: src.sinopse || null,
    status: false,
    csv_fallback: src.csv_fallback || null,
    capa_url: src.capa_url || null,
    relatorio_pdf_url: src.relatorio_pdf_url || null,
    leitura_url: src.leitura_url || null,
    config_json: src.config_json || null
  };

  const { data, error } = await state.supabase
    .from("pesquisas")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function handleWriteTest(){
  try {
    await runWriteTest();
  } catch (error) {
    console.error(error);
    const msg = `Falha no teste: ${error.message || String(error)}`;
    adminMsg(msg, "err");
    setDiagStatus("FALHOU no teste");
    setDiagOut({ error: errToObj(error) });
  }
}

async function runDiag(){
  const client = window.supabaseClient;
  if (!client) {
    setDiagStatus("Supabase client ausente");
    setDiagOut("Sem supabaseClient. Verifique supabase-config.js e supabase-client.js");
    return;
  }

  setDiagStatus("Rodando diagnóstico...");
  const sess = await client.auth.getSession();
  const user = await client.auth.getUser();

  const sel = await client
    .from("pesquisas")
    .select("id,slug,titulo,status,ordem,ano_base,updated_at")
    .order("ordem", { ascending: true })
    .limit(5);

  setDiagStatus("OK (sessão e select executados)");
  setDiagOut({
    session: sess.data?.session
      ? { hasSession: true, user_id: sess.data.session.user?.id, email: sess.data.session.user?.email }
      : { hasSession: false },
    user: user.data?.user ? { id: user.data.user.id, email: user.data.user.email } : null,
    select: sel.error ? { ok: false, error: errToObj(sel.error) } : { ok: true, rows: sel.data }
  });
}

async function runWriteTest(){
  const client = window.supabaseClient;
  if (!client) throw new Error("Supabase client ausente.");

  const slug = `teste-admin-${Date.now()}`;
  const payload = {
    slug,
    titulo: "Teste Admin",
    ano_base: "2025",
    ordem: 999,
    status: false
  };

  setDiagStatus("Testando INSERT...");
  setDiagOut({ step: "insert", payload });
  adminMsg("Testando INSERT...", "muted");
  const ins = await client.from("pesquisas").insert(payload).select("id").single();
  if (ins.error) {
    setDiagStatus("FALHOU no INSERT");
    setDiagOut({ step: "insert", error: errToObj(ins.error), hint: getRlsHint(ins.error) });
    return;
  }

  setDiagStatus("INSERT OK. Testando UPDATE...");
  adminMsg("INSERT OK. Testando UPDATE...", "muted");
  const upd = await client.from("pesquisas").update({ titulo: "Teste Admin (upd)" }).eq("id", ins.data.id);
  if (upd.error) {
    setDiagStatus("FALHOU no UPDATE");
    setDiagOut({ step: "update", inserted: ins.data, error: errToObj(upd.error), hint: getRlsHint(upd.error) });
    return;
  }

  setDiagStatus("UPDATE OK. Limpando (DELETE)...");
  adminMsg("UPDATE OK. Testando DELETE...", "muted");
  const del = await client.from("pesquisas").delete().eq("id", ins.data.id);
  if (del.error) {
    setDiagStatus("FALHOU no DELETE (não é grave)");
    setDiagOut({ step: "delete", inserted: ins.data, error: errToObj(del.error), hint: getRlsHint(del.error) });
    return;
  }

  setDiagStatus("CRUD OK ✅");
  setDiagOut({ ok: true, inserted: ins.data });
  adminMsg("CRUD OK ✅ (RLS e colunas estão corretas)", "ok");
}

function setTab(tab){
  els.tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  els.tabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.tabPanel !== tab));
}

async function loadPontos(){
  if (!state.current?.id) {
    els.pontosList.innerHTML = "<div class=\"muted\">Salve a pesquisa antes de adicionar pontos.</div>";
    return;
  }
  const { data, error } = await state.supabase
    .from("pontos")
    .select("*")
    .eq("pesquisa_id", state.current.id)
    .order("nome", { ascending: true });
  if (error) {
    console.error(error);
    return;
  }
  state.pontos = data || [];
  renderPontosList();
}

function renderPontosList(){
  els.pontosList.innerHTML = "";
  if (!state.pontos.length) {
    els.pontosList.innerHTML = "<div class=\"muted\">Nenhum ponto cadastrado.</div>";
    return;
  }
  state.pontos.forEach((ponto) => {
    const item = document.createElement("div");
    item.className = "ponto-item";
    item.innerHTML = `<strong>${escapeHtml(ponto.nome || "")}</strong><div class="muted">${escapeHtml(ponto.cidade || "")}/${escapeHtml(ponto.uf || "")}</div>`;
    item.addEventListener("click", () => fillPontoForm(ponto));
    els.pontosList.appendChild(item);
  });
}

function fillPontoForm(ponto){
  state.editingPonto = ponto;
  els.pontoFormTitle.textContent = ponto?.id ? "Editar ponto" : "Novo ponto";
  els.pontoDelete.classList.toggle("hidden", !ponto?.id);
  setPontoValue("nome", ponto?.nome || "");
  setPontoValue("cidade", ponto?.cidade || "");
  setPontoValue("uf", ponto?.uf || "");
  setPontoValue("categoria", ponto?.categoria || "");
  setPontoValue("lat", ponto?.lat ?? "");
  setPontoValue("lng", ponto?.lng ?? "");
  setPontoValue("descricao", ponto?.descricao || "");
  setPontoValue("site", ponto?.site || "");
  setPontoValue("instagram", ponto?.instagram || "");
  setPontoValue("facebook", ponto?.facebook || "");
  setPontoValue("whatsapp", ponto?.whatsapp || "");
  setPontoValue("email", ponto?.email || "");
  setPontoValue("ativo", String(ponto?.ativo ?? true));
}

function setPontoValue(name, value){
  const input = els.pontoForm.querySelector(`[name="${name}"]`);
  if (input) input.value = value ?? "";
}

async function handleSavePonto(e){
  e.preventDefault();
  if (!state.current?.id) return;

  const formData = new FormData(els.pontoForm);
  const payload = {
    id: state.editingPonto?.id,
    pesquisa_id: state.current.id,
    nome: String(formData.get("nome") || "").trim(),
    cidade: String(formData.get("cidade") || "").trim(),
    uf: String(formData.get("uf") || "").trim(),
    categoria: String(formData.get("categoria") || "").trim(),
    lat: toNumber(formData.get("lat")),
    lng: toNumber(formData.get("lng")),
    descricao: String(formData.get("descricao") || "").trim(),
    site: String(formData.get("site") || "").trim(),
    instagram: String(formData.get("instagram") || "").trim(),
    facebook: String(formData.get("facebook") || "").trim(),
    whatsapp: String(formData.get("whatsapp") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    ativo: String(formData.get("ativo") || "true") === "true"
  };

  const { error } = await state.supabase.from("pontos").upsert(payload);
  if (error) {
    console.error(error);
    return;
  }
  state.editingPonto = null;
  els.pontoForm.reset();
  await loadPontos();
}

async function handleDeletePonto(){
  if (!state.editingPonto?.id) return;
  if (!confirm("Excluir este ponto?")) return;
  const { error } = await state.supabase.from("pontos").delete().eq("id", state.editingPonto.id);
  if (error) {
    console.error(error);
    return;
  }
  state.editingPonto = null;
  els.pontoForm.reset();
  await loadPontos();
}

async function handleImportCsv(event){
  const file = event.target.files?.[0];
  if (!file || !state.current?.id) return;
  const text = await file.text();
  const rows = parseCsv(text);
  const payload = rows.map((r) => ({
    pesquisa_id: state.current.id,
    nome: r.nome,
    cidade: r.cidade,
    uf: r.uf,
    categoria: r.categoria,
    lat: r.lat,
    lng: r.lng,
    descricao: r.descricao,
    site: r.site,
    instagram: r.instagram,
    facebook: r.facebook,
    whatsapp: r.whatsapp,
    email: r.email,
    ativo: true
  })).filter((r) => r.nome);

  if (!payload.length) return;
  const { error } = await state.supabase.from("pontos").insert(payload);
  if (error) {
    console.error(error);
    return;
  }
  await loadPontos();
  event.target.value = "";
}

async function collectTopicos(slug){
  const items = Array.from(els.topicosList.querySelectorAll("[data-topic]"));
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const titulo = item.querySelector("[name=topicoTitulo]").value.trim();
    const texto = item.querySelector("[name=topicoTexto]").value.trim();
    const urlInput = item.querySelector("[name=topicoImagemUrl]");
    const file = item.querySelector("[name=topicoImagemFile]").files?.[0];
    const imageUrl = await maybeUploadFile(file, `pesquisas/${slug}/topicos/topico-${i + 1}`) || urlInput.value.trim();
    urlInput.value = imageUrl;
    results.push({ titulo, texto, imagem: imageUrl });
  }
  return results;
}

async function collectEquipe(slug){
  const items = Array.from(els.equipeList.querySelectorAll("[data-equipe]"));
  const results = [];
  for (const item of items) {
    const nome = item.querySelector("[name=equipeNome]").value.trim();
    const funcao = item.querySelector("[name=equipeFuncao]").value.trim();
    const urlInput = item.querySelector("[name=equipeFotoUrl]");
    const file = item.querySelector("[name=equipeFotoFile]").files?.[0];
    const safeName = slugify(nome || `membro-${results.length + 1}`);
    const fotoUrl = await maybeUploadFile(file, `pesquisas/${slug}/equipe/${safeName}`) || urlInput.value.trim();
    urlInput.value = fotoUrl;
    results.push({ nome, funcao, foto: fotoUrl });
  }
  return results;
}

async function maybeUploadFile(file, basePath){
  if (!(file instanceof File)) return "";
  const ext = file.name.split(".").pop();
  const path = `${basePath}.${ext}`;
  const { error } = await state.supabase.storage.from("site-assets").upload(path, file, { upsert: true });
  if (error) {
    console.error(error);
    return "";
  }
  const { data } = state.supabase.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

function parseCsv(text){
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const header = splitLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cols = splitLine(line, delimiter);
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cols[idx] || "";
    });
    return normalizeCsvRow(obj);
  });

  function splitLine(line, delim){
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

function normalizeCsvRow(row){
  const nome = pick(row, ["Nome", "nome", "Participante", "participante"]);
  const categoria = pick(row, ["Categoria", "categoria"]);
  const cidade = pick(row, ["Cidade", "cidade"]);
  const uf = pick(row, ["UF", "uf", "Estado", "estado"]);
  const lat = toNumber(pick(row, ["Latitude", "latitude", "Lat", "lat"]));
  const lng = toNumber(pick(row, ["Longitude", "longitude", "Lng", "lng"]));
  const descricao = pick(row, ["Descricao", "descrição", "Descrição", "descricao"]);
  const site = pick(row, ["Site", "site", "URL", "url"]);
  const instagram = pick(row, ["Instagram", "instagram"]);
  const facebook = pick(row, ["Facebook", "facebook"]);
  const whatsapp = pick(row, ["WhatsApp", "whatsapp", "Telefone", "telefone"]);
  const email = pick(row, ["Email", "email", "E-mail", "e-mail"]);

  return {
    nome: String(nome || "").trim(),
    categoria: String(categoria || "").trim(),
    cidade: String(cidade || "").trim(),
    uf: String(uf || "").trim(),
    lat,
    lng,
    descricao: String(descricao || "").trim(),
    site: String(site || "").trim(),
    instagram: String(instagram || "").trim(),
    facebook: String(facebook || "").trim(),
    whatsapp: String(whatsapp || "").trim(),
    email: String(email || "").trim()
  };
}

function pick(obj, keys){
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  }
  return "";
}

function toNumber(value){
  const num = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function slugify(value){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readFormToPayload(){
  const formData = new FormData(els.form);
  const slug = normalizeSlug(formData.get("slug"));
  if (!slug) throw new Error("Slug obrigatório");

  const titulo = String(formData.get("titulo") || "").trim();
  if (!titulo) throw new Error("Título obrigatório");

  setValue("slug", slug);

  const capaUrl = await maybeUploadFile(formData.get("capaFile"), `pesquisas/${slug}/capa`)
    || String(formData.get("capaUrl") || "").trim();

  const relatorioUrl = await maybeUploadFile(formData.get("relatorioFile"), `pesquisas/${slug}/relatorio`)
    || String(formData.get("relatorioUrl") || "").trim();

  const realizacaoLogo = await maybeUploadFile(formData.get("realizacaoLogoFile"), `pesquisas/${slug}/logos/realizacao`)
    || String(formData.get("realizacaoLogoUrl") || "").trim();

  const financiadorLogo = await maybeUploadFile(formData.get("financiadorLogoFile"), `pesquisas/${slug}/logos/financiador`)
    || String(formData.get("financiadorLogoUrl") || "").trim();

  const csvFallback = String(formData.get("csvUrl") || "").trim();
  const leituraUrl = String(formData.get("relatorioLeituraUrl") || "").trim();
  const topicos = await collectTopicos(slug);
  const equipe = await collectEquipe(slug);
  const configJson = buildConfigJsonFromTabs({
    formData,
    csvFallback,
    topicos,
    equipe,
    realizacaoLogo,
    financiadorLogo
  });

  setValue("capaUrl", capaUrl);
  setValue("relatorioUrl", relatorioUrl);
  setValue("relatorioUrlConfirm", relatorioUrl);
  setValue("relatorioLeituraUrlConfirm", leituraUrl);

  return {
    slug,
    titulo,
    ano_base: String(formData.get("anoBase") || "").trim() || null,
    ordem: Number(formData.get("ordem") || 0),
    descricao_curta: String(formData.get("descricaoCurta") || "").trim() || null,
    sinopse: String(formData.get("sinopse") || "").trim() || null,
    status: String(formData.get("status") || "true") === "true",
    csv_fallback: csvFallback || null,
    capa_url: capaUrl || null,
    relatorio_pdf_url: relatorioUrl || null,
    leitura_url: leituraUrl || null,
    config_json: configJson
  };
}

function buildConfigJsonFromTabs({ formData, csvFallback, topicos, equipe, realizacaoLogo, financiadorLogo }){
  return {
    mapa: {
      csvUrl: csvFallback
    },
    pesquisaResumo: {
      introducao: {
        titulo: String(formData.get("introTitulo") || "").trim(),
        texto: String(formData.get("introTexto") || "").trim()
      },
      citacao: {
        texto: String(formData.get("citacaoTexto") || "").trim(),
        autor: String(formData.get("citacaoAutor") || "").trim()
      },
      topicos
    },
    fichaTecnica: {
      realizacao: {
        nome: String(formData.get("realizacaoNome") || "").trim(),
        logo: realizacaoLogo
      },
      financiador: {
        nome: String(formData.get("financiadorNome") || "").trim(),
        logo: financiadorLogo
      },
      equipe
    }
  };
}

document.addEventListener("click", async (event) => {
  const btn = event.target?.closest("[data-act]");
  if (!btn) return;
  const action = btn.getAttribute("data-act");
  const id = btn.getAttribute("data-id");
  if (!action || !id) return;

  try {
    if (action === "edit") {
      const selected = researchCache.find((row) => String(row.id) === String(id));
      if (selected) loadResearchToForm(selected);
    }

    if (action === "dup") {
      if (!confirm("Duplicar esta pesquisa?")) return;
      setSaveMsg("Duplicando...");
      adminMsg("Duplicando...", "muted");
      const newId = await duplicateResearch(id);
      await refreshListAndSelect(newId);
      setSaveMsg("Duplicada ✅", true);
      adminMsg("Duplicada ✅", "ok");
    }

    if (action === "del") {
      if (!confirm("Excluir esta pesquisa? Isso não pode ser desfeito.")) return;
      setSaveMsg("Excluindo...");
      adminMsg("Excluindo...", "muted");
      await deleteResearch(id);
      if (String(currentResearchId) === String(id)) {
        currentResearchId = null;
        state.current = null;
      }
      await refreshListAndSelect(null);
      setSaveMsg("Excluída ✅", true);
      adminMsg("Excluída ✅", "ok");
    }
  } catch (error) {
    console.error(error);
    const msg = `Erro: ${formatSupabaseError(error)}`;
    setSaveMsg(msg);
    adminMsg(msg, "err");
  }
});

window.addEventListener("input", (event) => {
  if (event.target?.name === "capaUrl") {
    els.capaPreview.src = event.target.value;
    els.capaPreview.classList.toggle("hidden", !event.target.value);
  }
  if (event.target?.name === "relatorioUrl") {
    setValue("relatorioUrlConfirm", event.target.value);
  }
  if (event.target?.name === "relatorioLeituraUrl") {
    setValue("relatorioLeituraUrlConfirm", event.target.value);
  }
});
