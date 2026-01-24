import fs from "fs";
import path from "path";

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_ANON_KEY || "";

if (!url || !key) {
  console.log("SUPABASE_URL/KEY não setadas. Não gerou config.");
  process.exit(0);
}

const out = `window.SUPABASE_URL = "${url}";\nwindow.SUPABASE_ANON_KEY = "${key}";\n`;
const outPath = path.join("js", "supabase-config.js");
fs.mkdirSync("js", { recursive: true });
fs.writeFileSync(outPath, out, "utf8");
console.log("Gerado:", outPath);
