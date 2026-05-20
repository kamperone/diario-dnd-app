const SHEET_ID = "1A5Ko17ewraXref1idfH9apPaR7_aW6kfXgI_SP3qeRg";

const ALLOWED_TABS = new Set([
  "Sessioni",
  "Eventi",
  "Personaggi",
  "Questioni Aperte",
  "Stato Informazioni",
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (c === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") {
      cell += c;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function coerceValue(value) {
  const raw = value ?? "";
  const v = String(raw).trim();
  if (v === "TRUE" || v === "true" || v === "VERO") return true;
  if (v === "FALSE" || v === "false" || v === "FALSO") return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return raw;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h).trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = coerceValue(row[index] ?? "");
    });
    return obj;
  });
}

export default async function handler(req, res) {
  try {
    const tab = String(req.query.tab || "").trim();

    if (!ALLOWED_TABS.has(tab)) {
      res.status(400).json({ error: `Tab non valida o non consentita: ${tab}` });
      return;
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const response = await fetch(csvUrl, {
      headers: {
        "User-Agent": "diario-dnd-vercel/1.0",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      res.status(response.status).json({
        error: `Google Sheets ha risposto HTTP ${response.status}`,
        detail: body.slice(0, 500),
      });
      return;
    }

    const csv = await response.text();
    const data = rowsToObjects(parseCsv(csv));

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ tab, rows: data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
