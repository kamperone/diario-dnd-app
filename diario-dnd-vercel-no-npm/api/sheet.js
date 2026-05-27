const SHEET_ID = "1A5Ko17ewraXref1idfH9apPaR7_aW6kfXgI_SP3qeRg";

const ALLOWED_TABS = [
  "Sessioni",
  "Eventi",
  "Personaggi",
  "Questioni Aperte",
  "Stato Informazioni",
  "Diario Esteso",
  "Oggetti",
  "Fazioni",
  "Allegati",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((currentRow) => currentRow.some((value) => String(value).trim() !== ""));
}

function coerceValue(value) {
  const raw = value ?? "";
  const trimmed = String(raw).trim();
  if (trimmed === "TRUE" || trimmed === "true") return true;
  if (trimmed === "FALSE" || trimmed === "false") return false;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return raw;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => String(header).trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = coerceValue(row[index] ?? "");
    });
    return obj;
  });
}

export default async function handler(request, response) {
  const tab = String(request.query.tab || "");
  if (!ALLOWED_TABS.includes(tab)) {
    return response.status(400).json({ error: `Tab non valida o non consentita: ${tab}`, allowedTabs: ALLOWED_TABS });
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const googleResponse = await fetch(url);
    if (!googleResponse.ok) {
      const detail = await googleResponse.text();
      return response.status(googleResponse.status).json({ error: `Google Sheets ha risposto HTTP ${googleResponse.status}`, detail: detail.slice(0, 500) });
    }
    const csv = await googleResponse.text();
    const rows = rowsToObjects(parseCsv(csv));
    return response.status(200).json({ tab, rows });
  } catch (error) {
    return response.status(500).json({ error: "Errore interno durante la lettura dello Sheet", detail: error instanceof Error ? error.message : String(error) });
  }
}
