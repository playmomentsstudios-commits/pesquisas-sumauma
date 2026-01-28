import { escapeHtml } from "../utils.js";

const supabase = window.supabaseClient;

/* ==============================
   Helpers
============================== */
async function getPesquisaIdBySlug(slug) {
  const { data, error } = await supabase
    .from("pesquisas")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/* ==============================
   Render
============================== */
export async function renderMapaAdmin({ slug }) {
  const root = document.getElementById("admin-content");
  root.innerHTML = "<p>Carregando pontos do mapa...</p>";

  const pesquisaId = await getPesquisaIdBySlug(slug);
  if (!pesquisaId) {
    root.innerHTML = "<p>Pesquisa não encontrada.</p>";
    return;
  }

  const { data: pontos, error } = await supabase
    .from("pontos")
    .select("*")
    .eq("pesquisa_id", pesquisaId)
    .order("nome", { ascending: true });

  if (error) {
    root.innerHTML = "<p>Erro ao carregar pontos.</p>";
    return;
  }

  root.innerHTML = `
    <div class="admin-header">
      <h2>Mapa — Pontos cadastrados</h2>
      <button class="btn-primary" id="btn-novo-ponto">➕ Cadastrar novo</button>
    </div>

    <table class="admin-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Cidade / UF</th>
          <th>Categoria</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${pontos
          .map(
            (p) => `
          <tr>
            <td>${escapeHtml(p.nome)}</td>
            <td>${escapeHtml(p.cidade || "")} / ${escapeHtml(p.uf || "")}</td>
            <td>${escapeHtml(p.categoria || "")}</td>
            <td>${p.ativo ? "Ativo" : "Inativo"}</td>
            <td class="actions">
              <button data-edit="${p.id}">✏️ Editar</button>
              <button data-dup="${p.id}">📄 Duplicar</button>
              <button data-del="${p.id}">🗑 Excluir</button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  bindMapaActions(pesquisaId);
}

/* ==============================
   Ações
============================== */
function bindMapaActions(pesquisaId) {
  document
    .getElementById("btn-novo-ponto")
    ?.addEventListener("click", () => openForm({ pesquisaId }));

  document.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () =>
      openForm({ id: btn.dataset.edit, pesquisaId })
    )
  );

  document
    .querySelectorAll("[data-dup]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        duplicatePonto(btn.dataset.dup, pesquisaId)
      )
    );

  document.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", () => deletePonto(btn.dataset.del))
  );
}

/* ==============================
   CRUD
============================== */
async function openForm({ id = null, pesquisaId }) {
  let ponto = {
    nome: "",
    categoria: "",
    cidade: "",
    uf: "",
    lat: "",
    lng: "",
    descricao: "",
    ativo: true,
  };

  if (id) {
    const { data } = await supabase
      .from("pontos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) ponto = data;
  }

  const root = document.getElementById("admin-content");
  root.innerHTML = `
    <h2>${id ? "Editar ponto" : "Novo ponto"}</h2>

    <form id="ponto-form">
      <input required placeholder="Nome" name="nome" value="${escapeHtml(
        ponto.nome || ""
      )}" />
      <input placeholder="Categoria" name="categoria" value="${escapeHtml(
        ponto.categoria || ""
      )}" />
      <input placeholder="Cidade" name="cidade" value="${escapeHtml(
        ponto.cidade || ""
      )}" />
      <input placeholder="UF" name="uf" value="${escapeHtml(
        ponto.uf || ""
      )}" />
      <input placeholder="Latitude" name="lat" value="${ponto.lat || ""}" />
      <input placeholder="Longitude" name="lng" value="${ponto.lng || ""}" />
      <textarea placeholder="Descrição" name="descricao">${escapeHtml(
        ponto.descricao || ""
      )}</textarea>

      <label>
        <input type="checkbox" name="ativo" ${ponto.ativo ? "checked" : ""}/> Ativo
      </label>

      <button type="submit" class="btn-primary">Salvar</button>
      <button type="button" id="cancelar">Cancelar</button>
    </form>
  `;

  document.getElementById("cancelar").onclick = () =>
    renderMapaAdmin({ slug: window.currentPesquisaSlug });

  document.getElementById("ponto-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;

    const payload = {
      pesquisa_id: pesquisaId,
      nome: f.nome.value,
      categoria: f.categoria.value,
      cidade: f.cidade.value,
      uf: f.uf.value,
      lat: f.lat.value || null,
      lng: f.lng.value || null,
      descricao: f.descricao.value,
      ativo: f.ativo.checked,
    };

    if (id) {
      await supabase.from("pontos").update(payload).eq("id", id);
    } else {
      await supabase.from("pontos").insert(payload);
    }

    renderMapaAdmin({ slug: window.currentPesquisaSlug });
  };
}

async function duplicatePonto(id, pesquisaId) {
  const { data } = await supabase
    .from("pontos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;

  delete data.id;
  data.nome = `${data.nome} (cópia)`;
  data.pesquisa_id = pesquisaId;

  await supabase.from("pontos").insert(data);
  renderMapaAdmin({ slug: window.currentPesquisaSlug });
}

async function deletePonto(id) {
  if (!confirm("Deseja excluir este ponto?")) return;
  await supabase.from("pontos").delete().eq("id", id);
  renderMapaAdmin({ slug: window.currentPesquisaSlug });
}
