import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  EyeOff,
  Filter,
  Heart,
  Landmark,
  Map,
  RefreshCw,
  ScrollText,
  Search,
  Swords,
  Users,
} from "lucide-react";
import { fallbackData } from "./fallbackData.js";
import { fetchDatabase, SHEET_ID } from "./dataUtils.js";
import "./styles.css";

const tagClass = {
  "Segreto DM": "tag purple",
  "Noto ai PG": "tag cyan",
  "Oggettivo DM": "tag rose",
  "Questione aperta": "tag orange",
  Continuity: "tag zinc",
  PG: "tag blue",
  PNG: "tag green",
  Alta: "tag red",
  Media: "tag yellow",
  Bassa: "tag green",
  Aperta: "tag orange",
  Chiuso: "tag zinc",
};

function iconForEvent(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("arrivo") || t.includes("viaggio")) return Map;
  if (t.includes("cura")) return Landmark;
  if (t.includes("relazione")) return Heart;
  if (t.includes("png") || t.includes("stato png")) return Users;
  if (t.includes("lettera")) return ScrollText;
  if (t.includes("scelta")) return Filter;
  if (t.includes("combattimento")) return Swords;
  if (t.includes("rivelazione")) return EyeOff;
  return BookOpen;
}

function Tag({ children }) {
  const label = String(children || "");
  return <span className={tagClass[label] || "tag"}>{label}</span>;
}

function SectionCard({ section, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = section.icon || BookOpen;

  return (
    <article className="card section-card">
      <button type="button" className="section-head" onClick={() => setOpen((value) => !value)}>
        <span className="icon-box"><Icon size={20} /></span>
        <span className="section-title-wrap">
          <span className="section-title">{section.title}</span>
          <span className="tag-row">{section.tags.map((t) => <Tag key={t}>{t}</Tag>)}</span>
        </span>
        {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="section-body">
              <p>{section.body}</p>
              {section.items?.length > 0 && (
                <ul>
                  {section.items.map((item, index) => (
                    <li key={`${section.id}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function sessionSorter(a, b) {
  const sessionDiff = Number(b.sessione || 0) - Number(a.sessione || 0);
  if (sessionDiff !== 0) return sessionDiff;
  return String(b.session_id || "").localeCompare(String(a.session_id || ""));
}

function makeEventSections(events, sessionId) {
  return (events || [])
    .filter((event) => !sessionId || event.session_id === sessionId)
    .sort((a, b) => Number(a.ordine || 0) - Number(b.ordine || 0))
    .map((event) => {
      const tags = [
        event.tipo,
        ...String(event.tag || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ].filter(Boolean);
      if (event.noto_ai_pg === true) tags.push("Noto ai PG");
      if (event.segreto_dm === true) tags.push("Segreto DM");
      if (String(event.stato || "").toLowerCase().includes("apert")) tags.push("Questione aperta");
      return {
        id: event.event_id || `${event.session_id}-${event.ordine}`,
        icon: iconForEvent(event.tipo),
        title: event.titolo || event.tipo || "Evento",
        tags: [...new Set(tags)],
        body: event.descrizione || "",
        items: [
          event.luogo ? `Luogo: ${event.luogo}` : "",
          event.pg_coinvolti ? `PG coinvolti: ${event.pg_coinvolti}` : "",
          event.png_coinvolti ? `PNG coinvolti: ${event.png_coinvolti}` : "",
          event.fazioni ? `Fazioni: ${event.fazioni}` : "",
          event.conseguenze ? `Conseguenze: ${event.conseguenze}` : "",
          event.note_dm ? `Note DM: ${event.note_dm}` : "",
        ].filter(Boolean),
      };
    });
}

function makeExtendedDiarySections(diaryRows, sessionId) {
  return (diaryRows || [])
    .filter((row) => row.mostra_in_app !== false)
    .filter((row) => !sessionId || row.session_id === sessionId)
    .sort((a, b) => Number(a.ordine || 0) - Number(b.ordine || 0))
    .map((row) => {
      const tags = [
        row.tipo_sezione,
        ...String(row.tag || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ].filter(Boolean);
      if (row.noto_ai_pg === true) tags.push("Noto ai PG");
      if (row.segreto_dm === true) tags.push("Segreto DM");
      return {
        id: row.id || `${row.session_id}-${row.ordine}`,
        icon: iconForEvent(row.tipo_sezione),
        title: row.titolo_sezione || row.tipo_sezione || "Sezione diario",
        tags: [...new Set(tags)],
        body: row.contenuto_esteso || "",
        items: [],
      };
    });
}

export default function App() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("Tutti");
  const [tab, setTab] = useState("diario");
  const [db, setDb] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  async function loadFromSheet() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchDatabase();
      setDb(data);
      const latest = [...(data.sessions || [])].sort(sessionSorter)[0];
      setSelectedSessionId(latest?.session_id || "");
    } catch (error) {
      setDb(fallbackData);
      setSelectedSessionId(fallbackData.sessions[0]?.session_id || "");
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFromSheet();
  }, []);

  const sessions = useMemo(() => [...(db.sessions || [])].sort(sessionSorter), [db.sessions]);
  const latestSession = useMemo(() => {
    return sessions.find((session) => session.session_id === selectedSessionId) || sessions[0] || fallbackData.sessions[0];
  }, [sessions, selectedSessionId]);

  const eventSections = useMemo(() => {
    return makeEventSections(db.events || [], latestSession?.session_id);
  }, [db.events, latestSession]);

  const sections = useMemo(() => {
    const extended = makeExtendedDiarySections(db.diaryExtended || [], latestSession?.session_id);
    return extended.length > 0 ? extended : eventSections;
  }, [db.diaryExtended, eventSections, latestSession]);

  const allTags = useMemo(() => {
    const tags = new Set(["Tutti"]);
    sections.forEach((section) => section.tags.forEach((sectionTag) => tags.add(sectionTag)));
    return [...tags];
  }, [sections]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return sections.filter((section) => {
      const matchesTag = tag === "Tutti" || section.tags.includes(tag);
      const haystack = `${section.title} ${section.body} ${section.items?.join(" ") || ""} ${section.tags.join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesTag && matchesQuery;
    });
  }, [query, tag, sections]);

  const status = loading ? "Caricamento..." : loadError ? "Fallback locale" : "Collegato allo Sheet";

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="tag-row hero-tags"><Tag>{db.currentArc || "Atto II"}</Tag><Tag>Continuity</Tag></div>
          <h1>{db.campaign}</h1>
          <p>{db.summary}</p>
          <div className="status-row">
            <span className={`status ${loadError ? "bad" : loading ? "wait" : "ok"}`}>{status}</span>
            <button type="button" className="soft-button" onClick={loadFromSheet} disabled={loading}>
              <RefreshCw size={16} /> Aggiorna dati
            </button>
          </div>
          {loadError && <p className="error-note">Errore lettura Sheet: {loadError}. Sto mostrando una copia locale di emergenza.</p>}
        </div>
        <aside className="hero-panel">
          <div><span>Sessione:</span> {latestSession?.session_id || "—"}</div>
          <div><span>Luogo:</span> {latestSession?.luogo || "—"}</div>
          <div><span>Stato:</span> {latestSession?.stato || "—"}</div>
          <div><span>Sheet:</span> {SHEET_ID}</div>
        </aside>
      </header>

      <nav className="tabs">
        {[
          ["diario", "Diario", BookOpen],
          ["cast", "Personaggi", Users],
          ["questioni", "Questioni aperte", AlertTriangle],
          ["info", "Stato info", EyeOff],
          ["timeline", "Timeline", Clock],
        ].map(([key, label, Icon]) => (
          <button key={key} type="button" className={tab === key ? "tab active" : "tab"} onClick={() => setTab(key)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      {tab === "diario" && (
        <main>
          <section className="card controls-card">
            <div>
              <h2>Atto {latestSession?.atto} — Sessione {latestSession?.sessione}</h2>
              <p>{latestSession?.titolo}</p>
              <p className="diary-mode-note">Vista Diario esteso: testo lungo e aderente al resoconto operativo. La Timeline resta sintetica.</p>
            </div>
            <div className="control-grid">
              <select value={latestSession?.session_id || ""} onChange={(event) => setSelectedSessionId(event.target.value)}>
                {sessions.map((session) => (
                  <option key={session.session_id} value={session.session_id}>
                    {session.session_id} — {session.titolo}
                  </option>
                ))}
              </select>
              <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nel diario..." /></div>
              <select value={tag} onChange={(event) => setTag(event.target.value)}>
                {allTags.map((tagOption) => <option key={tagOption}>{tagOption}</option>)}
              </select>
            </div>
          </section>

          <section className="section-list">
            {filteredSections.map((section, index) => <SectionCard key={section.id} section={section} defaultOpen={index < 2} />)}
            {filteredSections.length === 0 && <div className="empty-state">Nessun risultato trovato.</div>}
          </section>
        </main>
      )}

      {tab === "cast" && (
        <main className="grid-cards">
          {(db.characters || []).map((character) => (
            <article key={character.nome} className="card mini-card">
              <div className="mini-head"><h3>{character.nome}</h3><Tag>{character.tipo}</Tag></div>
              <p><strong>Stato:</strong> {character.stato || "—"}</p>
              <p><strong>Livello:</strong> {character.livello || "—"}</p>
              <p><strong>Luogo:</strong> {character.luogo || "—"}</p>
              <p><strong>Relazioni:</strong> {character.relazioni || "—"}</p>
              <p>{character.note}</p>
            </article>
          ))}
        </main>
      )}

      {tab === "questioni" && (
        <main className="grid-cards">
          {(db.questions || []).map((question) => (
            <article key={question.id} className="card mini-card">
              <div className="mini-head"><h3>{question.area}</h3><Tag>{question.priorita}</Tag></div>
              <p>{question.domanda}</p>
              <p><strong>Stato:</strong> {question.stato}</p>
              <p><strong>Origine:</strong> {question.sessione_origine || "—"}</p>
              {question.segreto_dm === true && <Tag>Segreto DM</Tag>}
              {question.noto_ai_pg === true && <Tag>Noto ai PG</Tag>}
            </article>
          ))}
        </main>
      )}

      {tab === "info" && (
        <main className="grid-cards">
          {(db.info || []).map((item) => (
            <article key={item.id} className="card mini-card">
              <div className="mini-head"><h3>{item.id}</h3><Tag>{item.stato}</Tag></div>
              <p>{item.informazione}</p>
              <p><strong>Noto a:</strong> {item.noto_a || "—"}</p>
              <p><strong>Quando rivelare:</strong> {item.quando_rivelare || "—"}</p>
              <p>{item.note}</p>
            </article>
          ))}
        </main>
      )}

      {tab === "timeline" && (
        <main className="card timeline-card">
          <h2>Timeline sintetica</h2>
          <div className="timeline">
            {eventSections.map((event, index) => (
              <div key={event.id} className="timeline-row">
                <span className="timeline-index">{index + 1}</span>
                <div><strong>{event.title}</strong><p>{event.body}</p></div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
