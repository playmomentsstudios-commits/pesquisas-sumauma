export async function fetchPesquisaConteudoKV(supabase, pesquisaId) {
  const { data, error } = await supabase
    .from("pesquisa_conteudo")
    .select("key,value,imagem_creditos")
    .eq("pesquisa_id", pesquisaId);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function montarPesquisaResumo(rows) {
  const map = new Map();
  (rows || []).forEach((r) => map.set(r.key, r));

  const prStr = map.get("pesquisaResumo")?.value;
  if (prStr) {
    const pr = safeJsonParse(prStr, null);
    if (pr && typeof pr === "object") {
      if (!Array.isArray(pr.topicos)) pr.topicos = [];
      return pr;
    }
  }

  const topicosStr = map.get("pesquisaResumo.topicos")?.value;
  let topicos = safeJsonParse(topicosStr || "[]", []);
  if (!Array.isArray(topicos)) topicos = [];

  if (!topicos.length) {
    const tmp = [];
    for (let i = 1; i <= 50; i++) {
      const n = String(i).padStart(2, "0");
      const titulo = map.get(`topico_${n}_titulo`)?.value || "";
      const texto = map.get(`topico_${n}_texto`)?.value || "";
      const imagem = map.get(`topico_${n}_imagem_url`)?.value || "";
      const credito = map.get(`topico_${n}_imagem_url`)?.imagem_creditos || "";

      if (!titulo && !texto && !imagem) continue;
      tmp.push({ titulo, texto, imagem, imagem_creditos: credito });
    }
    topicos = tmp;
  }

  return {
    resumo: map.get("resumo")?.value || "",
    introducao: {
      titulo: map.get("introducao_titulo")?.value || "",
      texto: map.get("introducao_texto")?.value || ""
    },
    citacao: {
      texto: map.get("citacao_texto")?.value || "",
      autor: map.get("citacao_autor")?.value || ""
    },
    topicos
  };
}
