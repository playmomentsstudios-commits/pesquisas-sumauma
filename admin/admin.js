import { initSupabase } from "../src/js/supabase-client.js";

const state = {
  supabase: null,
  session: null,
  pesquisas: [],
  current: null,
  pontos: [],
  editingPonto: null
};

const els = {
  loginPanel: document.getElementById("login-panel"),
  loginForm: document.getElementById("login-form"),
  loginError: document.getElementById("login-error"),
  adminPanel: document.getElementById("admin-panel"),
  user: document.getElementById("admin-user"),
  logout: document.getElementById("btn-logout"),
  list: document.getElementById("pesquisas-list"),
  newBtn: document.getElementById("btn-new"),
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

init();

async function init(){
  state.supabase = await initSupabase();
  if (!state.supabase) {
    els.loginError.textContent = "Supabase não configurado. Crie o arquivo src/js/supabase-config.js.";
    els.loginForm.querySelector("button").disabled = true;
    return;
  }

  const { data } = await state.supabase.auth.getSession();
  setSession(data?.session ?? null);

  state.supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  els.loginForm.addEventListener("submit", handleLogin);
  els.logout.addEventListener("click", handleLogout);
  els.newBtn.addEventListener("click", () => openForm(createEmptyPesquisa()));
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

function createEmptyPesquisa(){
  return {
    slug: "",
    titulo: "",
    anoBase: "",
    descricaoCurta: "",
    sinopse: "",
    status: true,
    ordem: 0,
    config_json: {
      mapa: {},
      pesquisaResumo: {},
      fichaTecnica: {}
    }
  };
}

function setSession(session){
  state.session = session;
  const loggedIn = !!session;
  els.loginPanel.classList.toggle("hidden", loggedIn);
  els.adminPanel.classList.toggle("hidden", !loggedIn);
  els.logout.classList.toggle("hidden", !loggedIn);
  els.user.textContent = session?.user?.email || "";
  if (loggedIn) {
    loadPesquisas();
  }
}

async function handleLogin(e){
  e.preventDefault();
  els.loginError.textContent = "";
  const formData = new FormData(els.loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    els.loginError.textContent = error.message;
  }
}

async function handleLogout(){
  await state.supabase.auth.signOut();
}

async function loadPesquisas(){
  const { data, error } = await state.supabase
    .from("pesquisas")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  state.pesquisas = data || [];
  renderPesquisasList();
  if (state.pesquisas.length === 0) {
    openForm(createEmptyPesquisa());
  }
}

function renderPesquisasList(){
  els.list.innerHTML = "";
  state.pesquisas.forEach((pesquisa) => {
    const item = document.createElement("div");
    item.className = "pesquisa-item" + (state.current?.id === pesquisa.id ? " active" : "");
    item.innerHTML = `
      <strong>${escapeHtml(pesquisa.titulo || "(Sem título)")}</strong>
      <div class="muted">/${escapeHtml(pesquisa.slug || "")}</div>
    `;
    item.addEventListener("click", () => openForm(pesquisa));
    els.list.appendChild(item);
  });
}

function openForm(pesquisa){
  state.current = pesquisa;
  state.editingPonto = null;
  els.form.classList.remove("hidden");
  els.emptyState.classList.add("hidden");
  els.formTitle.textContent = pesquisa.id ? "Editar pesquisa" : "Nova pesquisa";
  els.deleteBtn.classList.toggle("hidden", !pesquisa.id);

  fillForm(pesquisa);
  setTab("conteudo");
  loadPontos();
}

function fillForm(pesquisa){
  const cfg = pesquisa.config_json || {};
  const ficha = cfg.fichaTecnica || {};
  const resumo = cfg.pesquisaResumo || {};
  const mapa = cfg.mapa || {};

  setValue("slug", pesquisa.slug || "");
  setValue("titulo", pesquisa.titulo || "");
  setValue("anoBase", pesquisa.anoBase || "");
  setValue("ordem", pesquisa.ordem ?? 0);
  setValue("descricaoCurta", pesquisa.descricaoCurta || "");
  setValue("sinopse", pesquisa.sinopse || "");
  setValue("status", String(pesquisa.status ?? true));
  setValue("csvUrl", mapa.csvUrl || "");
  setValue("capaUrl", pesquisa.capa_url || cfg.capa || "");
  setValue("relatorioUrl", pesquisa.relatorio_pdf_url || cfg.relatorioPdf || "");
  setValue("relatorioLeituraUrl", pesquisa.relatorio_leitura_url || cfg.relatorioLeituraUrl || "");
  setValue("relatorioUrlConfirm", pesquisa.relatorio_pdf_url || cfg.relatorioPdf || "");
  setValue("relatorioLeituraUrlConfirm", pesquisa.relatorio_leitura_url || cfg.relatorioLeituraUrl || "");

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

  const formData = new FormData(els.form);
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) return;

  const capaUrl = await maybeUploadFile(formData.get("capaFile"), `pesquisas/${slug}/capa`)
    || String(formData.get("capaUrl") || "").trim();

  const relatorioUrl = await maybeUploadFile(formData.get("relatorioFile"), `pesquisas/${slug}/relatorio`)
    || String(formData.get("relatorioUrl") || "").trim();

  const realizacaoLogo = await maybeUploadFile(formData.get("realizacaoLogoFile"), `pesquisas/${slug}/logos/realizacao`)
    || String(formData.get("realizacaoLogoUrl") || "").trim();

  const financiadorLogo = await maybeUploadFile(formData.get("financiadorLogoFile"), `pesquisas/${slug}/logos/financiador`)
    || String(formData.get("financiadorLogoUrl") || "").trim();

  const topicos = await collectTopicos(slug);
  const equipe = await collectEquipe(slug);

  const configJson = {
    mapa: {
      csvUrl: String(formData.get("csvUrl") || "").trim()
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

  const payload = {
    id: state.current?.id,
    slug,
    titulo: String(formData.get("titulo") || "").trim(),
    anoBase: String(formData.get("anoBase") || "").trim(),
    ordem: Number(formData.get("ordem") || 0),
    descricaoCurta: String(formData.get("descricaoCurta") || "").trim(),
    sinopse: String(formData.get("sinopse") || "").trim(),
    status: String(formData.get("status") || "true") === "true",
    capa_url: capaUrl,
    relatorio_pdf_url: relatorioUrl,
    relatorio_leitura_url: String(formData.get("relatorioLeituraUrl") || "").trim(),
    config_json: configJson
  };

  const { data, error } = await state.supabase.from("pesquisas").upsert(payload).select("*").single();
  if (error) {
    console.error(error);
    return;
  }

  state.current = data;
  await loadPesquisas();
  openForm(data);
}

async function handleDeletePesquisa(){
  if (!state.current?.id) return;
  if (!confirm("Excluir esta pesquisa?")) return;
  const { error } = await state.supabase.from("pesquisas").delete().eq("id", state.current.id);
  if (error) {
    console.error(error);
    return;
  }
  state.current = null;
  await loadPesquisas();
  els.form.classList.add("hidden");
  els.emptyState.classList.remove("hidden");
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
