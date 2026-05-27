const SHEETS = {
  sessions: "Sessioni",
  events: "Eventi",
  characters: "Personaggi",
  questions: "Questioni Aperte",
  info: "Stato Informazioni",
  diary: "Diario Esteso",
  attachments: "Allegati",
};

const state = {
  tab: "diario",
  query: "",
  selectedSession: "",
  data: {
    sessions: [], events: [], characters: [], questions: [], info: [], diary: [], attachments: [],
  },
};

const fallback = {
  sessions: [
    { session_id: "A2-S1", atto: "II", sessione: 1, titolo: "Ritorno a Candlekeep e biforcazione dei frammenti", luogo: "Candlekeep", stato: "Conclusa", sintesi: "Fallback locale: dati minimi non aggiornati." },
  ],
  events: [], characters: [], questions: [], info: [], diary: [], attachments: [],
};

function el(id) { return document.getElementById(id); }
function normalize(value) { return String(value ?? "").toLowerCase(); }
function truthy(value) { return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1"; }
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function tag(label) { return label ? `<span class="pill">${escapeHtml(label)}</span>` : ""; }
function matchesQuery(item) {
  const q = normalize(state.query).trim();
  if (!q) return true;
  return normalize(Object.values(item).join(" ")).includes(q);
}
function byOrder(a, b) { return Number(a.ordine || a.sessione || 0) - Number(b.ordine || b.sessione || 0); }
function currentSession() {
  return state.data.sessions.find(s => s.session_id === state.selectedSession) || state.data.sessions[0] || {};
}

async function fetchTab(tab) {
  const res = await fetch(`/api/sheet?tab=${encodeURIComponent(tab)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${tab}: HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.rows) ? json.rows : [];
}

async function loadData() {
  setStatus("Caricamento dati...", "");
  try {
    const [sessions, events, characters, questions, info, diary, attachments] = await Promise.all([
      fetchTab(SHEETS.sessions), fetchTab(SHEETS.events), fetchTab(SHEETS.characters),
      fetchTab(SHEETS.questions), fetchTab(SHEETS.info), fetchTab(SHEETS.diary), fetchTab(SHEETS.attachments),
    ]);
    state.data = { sessions, events, characters, questions, info, diary, attachments };
    if (!state.selectedSession) {
      const sorted = [...sessions].sort((a,b) => Number(b.sessione || 0) - Number(a.sessione || 0));
      state.selectedSession = sorted[0]?.session_id || sessions[0]?.session_id || "";
    }
    setStatus("Collegato al Google Sheet", "ok");
  } catch (err) {
    console.error(err);
    state.data = fallback;
    state.selectedSession = fallback.sessions[0].session_id;
    setStatus(`Fallback locale: ${err.message}`, "err");
  }
  hydrateControls();
  render();
}

function setStatus(text, cls) {
  const node = el("status");
  node.textContent = text;
  node.className = `status ${cls || ""}`;
}

function hydrateControls() {
  const select = el("sessionSelect");
  const sessions = [...state.data.sessions].sort((a,b) => Number(b.sessione || 0) - Number(a.sessione || 0));
  select.innerHTML = sessions.map(s => `<option value="${escapeHtml(s.session_id)}">${escapeHtml(s.session_id)} — ${escapeHtml(s.titolo || "Senza titolo")}</option>`).join("");
  select.value = state.selectedSession;
  const s = currentSession();
  el("currentSessionLabel").textContent = s.session_id ? `${s.session_id} — ${s.titolo || ""}` : "—";
  el("currentLocation").textContent = s.luogo || "—";
  el("currentStatus").textContent = s.stato || "—";
  el("summary").textContent = s.sintesi || "Diario operativo della campagna.";
}

function filteredSessionRows(rows) {
  return rows.filter(r => (!r.session_id || r.session_id === state.selectedSession) && matchesQuery(r));
}

function render() {
  hydrateControls();
  const content = el("content");
  const renderers = { diario: renderDiary, timeline: renderTimeline, personaggi: renderCharacters, questioni: renderQuestions, info: renderInfo, allegati: renderAttachments };
  content.innerHTML = (renderers[state.tab] || renderDiary)();
}

function renderDiary() {
  const rows = filteredSessionRows(state.data.diary).filter(r => truthy(r.mostra_in_app) || r.mostra_in_app === "").sort(byOrder);
  const attachments = filteredSessionRows(state.data.attachments).filter(a => truthy(a.visibile_in_app));
  if (!rows.length && !attachments.length) return `<div class="empty">Nessuna voce diario per questa sessione.</div>`;
  const diaryHtml = rows.map(r => `
    <article class="card">
      <div class="meta">${tag(r.tipo_sezione)}${tag(r.tag)}</div>
      <h2>${escapeHtml(r.titolo_sezione)}</h2>
      <div class="text">${escapeHtml(r.contenuto_esteso)}</div>
    </article>`).join("");
  const attachHtml = attachments.length ? `<section class="card"><h2>Allegati collegati a questa sessione</h2><div class="attachment-grid">${attachments.map(attachmentCard).join("")}</div></section>` : "";
  return diaryHtml + attachHtml;
}

function renderTimeline() {
  const rows = filteredSessionRows(state.data.events).sort(byOrder);
  if (!rows.length) return `<div class="empty">Nessun evento per questa sessione.</div>`;
  return rows.map(r => `
    <article class="card">
      <div class="meta">${tag(r.tipo)}${tag(r.stato)}${truthy(r.segreto_dm) ? tag("Segreto DM") : ""}</div>
      <h2>${escapeHtml(r.ordine)}. ${escapeHtml(r.titolo)}</h2>
      <p>${escapeHtml(r.descrizione)}</p>
      <div class="details">
        ${r.luogo ? `<div class="kv"><strong>Luogo:</strong> ${escapeHtml(r.luogo)}</div>` : ""}
        ${r.pg_coinvolti ? `<div class="kv"><strong>PG:</strong> ${escapeHtml(r.pg_coinvolti)}</div>` : ""}
        ${r.png_coinvolti ? `<div class="kv"><strong>PNG:</strong> ${escapeHtml(r.png_coinvolti)}</div>` : ""}
        ${r.conseguenze ? `<div class="kv"><strong>Conseguenze:</strong> ${escapeHtml(r.conseguenze)}</div>` : ""}
      </div>
    </article>`).join("");
}

function renderCharacters() {
  const rows = state.data.characters.filter(matchesQuery);
  if (!rows.length) return `<div class="empty">Nessun personaggio trovato.</div>`;
  return rows.map(r => `
    <article class="card">
      <div class="meta">${tag(r.tipo)}${tag(r.stato)}</div>
      <h2>${escapeHtml(r.nome)}</h2>
      <div class="details">
        ${r.livello ? `<div class="kv"><strong>Livello:</strong> ${escapeHtml(r.livello)}</div>` : ""}
        ${r.luogo ? `<div class="kv"><strong>Luogo:</strong> ${escapeHtml(r.luogo)}</div>` : ""}
        ${r.fazione ? `<div class="kv"><strong>Fazione:</strong> ${escapeHtml(r.fazione)}</div>` : ""}
        ${r.relazioni ? `<div class="kv"><strong>Relazioni:</strong> ${escapeHtml(r.relazioni)}</div>` : ""}
        ${r.note ? `<div class="kv"><strong>Note:</strong> ${escapeHtml(r.note)}</div>` : ""}
      </div>
    </article>`).join("");
}

function renderQuestions() {
  const rows = filteredSessionRows(state.data.questions).filter(matchesQuery);
  if (!rows.length) return `<div class="empty">Nessuna questione aperta trovata.</div>`;
  return rows.map(r => `
    <article class="card">
      <div class="meta">${tag(r.area)}${tag(r.priorita)}${tag(r.stato)}${truthy(r.segreto_dm) ? tag("Segreto DM") : ""}</div>
      <h2>${escapeHtml(r.domanda)}</h2>
      ${r.note ? `<p>${escapeHtml(r.note)}</p>` : ""}
    </article>`).join("");
}

function renderInfo() {
  const rows = filteredSessionRows(state.data.info).filter(matchesQuery);
  if (!rows.length) return `<div class="empty">Nessuna informazione trovata.</div>`;
  return rows.map(r => `
    <article class="card">
      <div class="meta">${tag(r.stato)}${tag(r.sessione_origine)}</div>
      <h2>${escapeHtml(r.id)}</h2>
      <p>${escapeHtml(r.informazione)}</p>
      <div class="details">
        ${r.noto_a ? `<div class="kv"><strong>Noto a:</strong> ${escapeHtml(r.noto_a)}</div>` : ""}
        ${r.quando_rivelare ? `<div class="kv"><strong>Quando rivelare:</strong> ${escapeHtml(r.quando_rivelare)}</div>` : ""}
        ${r.note ? `<div class="kv"><strong>Note:</strong> ${escapeHtml(r.note)}</div>` : ""}
      </div>
    </article>`).join("");
}

function renderAttachments() {
  const rows = filteredSessionRows(state.data.attachments).filter(r => truthy(r.visibile_in_app));
  if (!rows.length) return `<div class="empty">Nessun allegato collegato alla sessione selezionata.</div>`;
  return `<div class="attachment-grid">${rows.map(attachmentCard).join("")}</div>`;
}

function directImageUrl(url) {
  const match = String(url || "").match(/\/file\/d\/([^/]+)/);
  if (!match) return url;
  return `https://drive.google.com/uc?export=view&id=${match[1]}`;
}
function attachmentCard(r) {
  const isImg = normalize(r.tipo_file).includes("immagine") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(String(r.url || ""));
  const preview = isImg ? `<img class="thumb" src="${escapeHtml(directImageUrl(r.url))}" alt="${escapeHtml(r.titolo)}" loading="lazy" onerror="this.style.display='none'" />` : "";
  return `
    <article class="card attachment-card">
      ${preview}
      <div class="meta">${tag(r.tipo_file)}${tag(r.categoria)}${tag(r.session_id)}</div>
      <h3>${escapeHtml(r.titolo)}</h3>
      ${r.descrizione ? `<p>${escapeHtml(r.descrizione)}</p>` : ""}
      ${r.tag ? `<div class="small">Tag: ${escapeHtml(r.tag)}</div>` : ""}
      <a class="button primary" href="${escapeHtml(r.url)}" target="_blank" rel="noreferrer">Apri allegato</a>
    </article>`;
}

el("refreshBtn").addEventListener("click", loadData);
el("sessionSelect").addEventListener("change", (e) => { state.selectedSession = e.target.value; render(); });
el("searchInput").addEventListener("input", (e) => { state.query = e.target.value; render(); });
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.tab = btn.dataset.tab;
    render();
  });
});

loadData();
