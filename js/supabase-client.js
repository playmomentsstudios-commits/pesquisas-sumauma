(function () {
  function pick(key) {
    return (window && window[key]) ? String(window[key]).trim() : "";
  }

  function init() {
    if (window.supabaseClient) {
      window.__SUPABASE_CONFIG_OK__ = true;
      return;
    }

    const url = pick("SUPABASE_URL");
    const anon = pick("SUPABASE_ANON_KEY");

    if (!url || !anon) {
      console.warn("[Supabase] Config ausente. Verifique js/supabase-config.js");
      window.supabaseClient = null;
      window.__SUPABASE_CONFIG_OK__ = false;
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      console.error("[Supabase] CDN supabase-js não carregou.");
      window.supabaseClient = null;
      window.__SUPABASE_CONFIG_OK__ = false;
      return;
    }

    window.supabaseClient = window.supabase.createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    window.__SUPABASE_CONFIG_OK__ = true;
    console.log("[Supabase] Client OK:", url);
  }

  const loader = window.__SUPABASE_CONFIG_LOADED__;
  if (loader && typeof loader.then === "function") {
    loader.finally(init);
  } else {
    init();
  }
})();
