export async function getPesquisaConteudoKV(supabase, pesquisaId) {
  const { data, error } = await supabase
    .from("pesquisa_conteudo")
    .select("id,key,value,imagem_creditos")
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

export function buildPesquisaResumoFromKV(rows) {
  const map = new Map();
  (rows || []).forEach((r) => map.set(r.key, r));

  // 1) prioridade: pesquisaResumo (JSON completo)
  const pr = map.get("pesquisaResumo")?.value;
  if (pr) {
    const obj = safeJsonParse(pr, null);
    if (obj && typeof obj === "object") {
      // garantia: topicos sempre array
      if (!Array.isArray(obj.topicos)) obj.topicos = [];
      obj.topicos = obj.topicos.map((t) => ({
        ...t,
        imagem: t?.imagem || t?.imagem_url || ""
      }));
      return obj;
    }
  }

  // 2) montar pelos campos simples
  const resumo = map.get("resumo")?.value || "";

  const introducao = {
    titulo: map.get("introducao_titulo")?.value || "",
    texto: map.get("introducao_texto")?.value || ""
  };

  const citacao = {
    texto: map.get("citacao_texto")?.value || "",
    autor: map.get("citacao_autor")?.value || ""
  };

  // 3) topicos via pesquisaResumo.topicos (JSON string)
  const topicosStr = map.get("pesquisaResumo.topicos")?.value;
  let topicos = [];
  if (topicosStr) {
    topicos = safeJsonParse(topicosStr, []);
    if (!Array.isArray(topicos)) topicos = [];
    topicos = topicos.map((t) => ({
      ...t,
      imagem: t?.imagem || t?.imagem_url || ""
    }));
  }

  // 4) fallback final: topico_XX_* (KV)
  if (!topicos.length) {
    const tmp = [];
    for (let i = 1; i <= 50; i++) {
      const n = String(i).padStart(2, "0");
      const titulo = map.get(`topico_${n}_titulo`)?.value;
      const texto = map.get(`topico_${n}_texto`)?.value;
      const imagem = map.get(`topico_${n}_imagem_url`)?.value;
      const imagem_creditos = map.get(`topico_${n}_imagem_url`)?.imagem_creditos || "";

      // se estiver tudo vazio, pula
      if (!titulo && !texto && !imagem) continue;

      tmp.push({
        titulo: titulo || "",
        texto: texto || "",
        imagem: imagem || "",
        imagem_creditos
      });
    }
    topicos = tmp;
  }

  return { resumo, introducao, citacao, topicos };
}

export async function upsertKV(supabase, pesquisaId, key, value, imagem_creditos = null) {
  // sem ON CONFLICT (não existe unique)
  const { data: existing, error: e1 } = await supabase
    .from("pesquisa_conteudo")
    .select("id")
    .eq("pesquisa_id", pesquisaId)
    .eq("key", key)
    .limit(1);

  if (e1) throw e1;

  if (existing && existing.length) {
    const { error: e2 } = await supabase
      .from("pesquisa_conteudo")
      .update({ value, imagem_creditos })
      .eq("id", existing[0].id);
    if (e2) throw e2;
  } else {
    const { error: e3 } = await supabase
      .from("pesquisa_conteudo")
      .insert({ pesquisa_id: pesquisaId, key, value, imagem_creditos });
    if (e3) throw e3;
  }
}
