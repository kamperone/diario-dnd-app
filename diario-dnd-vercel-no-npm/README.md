# Diario D&D - versione senza npm

Questa versione non usa React, Vite o dipendenze npm.
È composta da file statici + una funzione serverless Vercel in `api/sheet.js`.

## Impostazioni Vercel consigliate

- Framework Preset: Other
- Root Directory: questa cartella
- Install Command: lasciare vuoto, oppure `echo no install`
- Build Command: lasciare vuoto, oppure `echo no build`
- Output Directory: lasciare vuoto

Non serve `package.json`.
