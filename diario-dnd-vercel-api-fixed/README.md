# Diario Operativo D&D — App Vercel

App React/Vite per consultare il Diario operativo della campagna D&D da un Google Sheet pubblicato in sola lettura.

## Fonte dati

Google Sheet collegato:

`1A5Ko17ewraXref1idfH9apPaR7_aW6kfXgI_SP3qeRg`

L'app prova a leggere le schede:

- Sessioni
- Eventi
- Personaggi
- Questioni Aperte
- Stato Informazioni

Se la lettura fallisce, mostra una copia locale di emergenza.

## Uso locale

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Deploy su Vercel

### Metodo semplice via GitHub

1. Crea un repository GitHub.
2. Carica tutto il contenuto di questa cartella.
3. Vai su Vercel e scegli **Add New Project**.
4. Importa il repository.
5. Vercel dovrebbe riconoscere Vite automaticamente.
6. Build command: `npm run build`.
7. Output directory: `dist`.
8. Deploy.

### Metodo CLI

```bash
npm install
npm run build
npx vercel
npx vercel --prod
```

## Note sicurezza

L'app legge solo il Google Sheet pubblicato. Non dà accesso al resto di Google Drive.
Usare sul foglio permessi di sola visualizzazione.

## Fix API Vercel

Questa versione include una funzione serverless in `api/sheet.js`.
L'app non legge più Google Sheets solo dal browser: prova prima `/api/sheet?tab=...`, che gira su Vercel e aggira i problemi CORS/NetworkError del browser.
