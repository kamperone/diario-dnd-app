# Diario D&D App

App React + Vite per consultare il Diario operativo della campagna D&D.

## Funzioni

- Diario esteso leggibile per sessione
- Timeline sintetica
- Personaggi
- Questioni aperte
- Stato informazioni
- Allegati indicizzati da Google Drive tramite la scheda `Allegati`

## Allegati

L'app non carica file direttamente. Per aggiungere un allegato:

1. Carica il file su Google Drive.
2. Imposta il file come `Chiunque abbia il link → Visualizzatore` se deve essere visibile nell'app.
3. Aggiungi una riga nella scheda `Allegati` del Google Sheet con:
   - `id`
   - `session_id`
   - `titolo`
   - `tipo_file`
   - `categoria`
   - `descrizione`
   - `url`
   - `visibile_in_app` = TRUE
   - `tag`
   - `note_dm`

## Deploy

Root directory Vercel: cartella del progetto contenente `package.json`.

Build command: `npm run build`
Output directory: `dist`
