const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
        body: "",
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !KEY) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing SUPABASE_URL or service key env var." }),
      };
    }

    const params = event.queryStringParameters || {};
    const pesquisaId = (params.pesquisa_id || "").trim();
    const ativoParam = params.ativo;
    const ativo = ativoParam === undefined ? true : String(ativoParam).toLowerCase() !== "false";

    if (!pesquisaId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing required query param: pesquisa_id" }),
      };
    }

    const supabase = createClient(SUPABASE_URL, KEY, {
      auth: { persistSession: false },
    });

    const select = [
      "id",
      "pesquisa_id",
      "nome",
      "categoria",
      "territorio",
      "cidade",
      "uf",
      "lat",
      "lng",
      "descricao",
      "ativo",
      "site",
      "instagram",
      "facebook",
      "whatsapp",
      "email",
      "youtube",
      "linkedin",
      "tiktok",
      "telefone",
    ].join(",");

    let query = supabase.from("pontos").select(select).eq("pesquisa_id", pesquisaId);
    if (ativo) query = query.eq("ativo", true);

    const { data, error } = await query.order("id", { ascending: true });

    if (error) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: data || [] }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: String(e?.message || e) }),
    };
  }
};
