import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let client = null;

export function getSupabase(){
  try{
    return client;
  }catch(e){
    return null;
  }
}

export async function initSupabase(){
  try{
    const cfg = await import("./supabase-config.js");
    if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) return null;
    client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return client;
  }catch(e){
    return null;
  }
}
