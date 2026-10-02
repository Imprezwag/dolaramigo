// Lee el dolar blue de Bahia Blanca en InfoDolar y escribe cotizacion.json
import { writeFileSync } from "node:fs";

const SOURCE = "https://www.infodolar.com/cotizacion-dolar-localidad-bahia-blanca-provincia-buenos-aires.aspx";

const parseAR = (s) => parseFloat(s.replace(/\./g, "").replace(",", "."));
const strip = (h) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&oacute;/g, "ó").replace(/&iacute;/g, "í").replace(/\s+/g, " ");

export function parse(html) {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    if (!/d[oó]lar\s+blue\s+en\s+bah[ií]a/i.test(strip(row))) continue;
    const vals = [];
    for (const cell of row.split(/<td/i).slice(1)) {
      const m = strip("<td" + cell).match(/\$\s*([\d.]+,\d{2})/);
      if (m) vals.push(parseAR(m[1]));
      if (vals.length === 2) break;
    }
    const d = row.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?/);
    if (vals.length === 2) return { compra: vals[0], venta: vals[1], fuente: d ? d[0] : null };
  }
  throw new Error("No se encontro la fila del dolar blue de Bahia Blanca");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const res = await fetch(SOURCE, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "es-AR,es;q=0.9",
    },
  });
  if (!res.ok) throw new Error("InfoDolar respondio HTTP " + res.status);
  const q = parse(await res.text());
  if (!(q.compra > 0) || q.venta < q.compra || (q.venta - q.compra) / q.compra > 0.2) {
    throw new Error("Valores fuera de rango: " + JSON.stringify(q));
  }
  const out = { ...q, leido: new Date().toISOString(), url: SOURCE };
  writeFileSync("cotizacion.json", JSON.stringify(out, null, 2) + "\n");
  console.log(out);
}
