export const SHEET_ID = "1A5Ko17ewraXref1idfH9apPaR7_aW6kfXgI_SP3qeRg";

export const TABS = {
  sessions: "Sessioni",
  events: "Eventi",
  characters: "Personaggi",
  questions: "Questioni Aperte",
  info: "Stato Informazioni",
};

export function parseCsv(text) {
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

export function coerceValue(value) {
  const raw = value ?? "";
  const v = String(raw).trim();
  if (v === "TRUE" || v === "true") return true;
  if (v === "FALSE" || v === "false") return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return raw;
}

export function rowsToObjects(rows) {
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

async function fetchJsonEndpoint(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchCsvEndpoint(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return rowsToObjects(parseCsv(text));
}

export async function fetchSheetTab(tabName) {
  const encodedTab = encodeURIComponent(tabName);
  const endpoints = [
    {
      name: "vercel-api",
      load: async () => {
        const response = await fetch(`/api/sheet?tab=${encodedTab}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        return payload.rows;
      },
    },
    {
      name: "opensheet",
      load: () => fetchJsonEndpoint(`https://opensheet.elk.sh/${SHEET_ID}/${encodedTab}`),
    },
    {
      name: "google-gviz",
      load: () => fetchCsvEndpoint(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedTab}`),
    },
  ];

  const errors = [];
  for (const endpoint of endpoints) {
    try {
      const rows = await endpoint.load();
      if (Array.isArray(rows)) return rows;
      throw new Error("Formato dati non valido");
    } catch (error) {
      errors.push(`${endpoint.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Impossibile leggere ${tabName}. Tentativi falliti: ${errors.join(" | ")}`);
}

export async function fetchDatabase() {
  const [sessions, events, characters, questions, info] = await Promise.all([
    fetchSheetTab(TABS.sessions),
    fetchSheetTab(TABS.events),
    fetchSheetTab(TABS.characters),
    fetchSheetTab(TABS.questions),
    fetchSheetTab(TABS.info),
  ]);

  const latestSession = [...sessions].sort((a, b) => {
    const sessionDiff = Number(b.sessione || 0) - Number(a.sessione || 0);
    if (sessionDiff !== 0) return sessionDiff;
    return String(b.session_id || "").localeCompare(String(a.session_id || ""));
  })[0];

  return {
    campaign: "Diario operativo — Campagna D&D",
    currentArc: latestSession ? `Atto ${latestSession.atto}` : "Atto II",
    lastUpdated: latestSession ? `${latestSession.session_id} — ${latestSession.titolo}` : "Database collegato",
    summary: latestSession?.sintesi || "Diario operativo della campagna D&D.",
    sessions,
    events,
    characters,
    questions,
    info,
  };
}
