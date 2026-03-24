# PMTool_UI

Next.js-Frontend fuer das PM-Tool.

## Stack

- Next.js 14
- React 18
- TypeScript
- TanStack Query
- Zustand
- Tailwind CSS

## Lokal starten

1. Abhaengigkeiten installieren:

```bash
npm install
```

2. Lokale Env-Datei anlegen:

```bash
cp .env.local.example .env.local
```

3. Development-Server starten:

```bash
npm run dev
```

Standardmaessig erwartet das Frontend das Backend unter:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

## Production / Vercel

In Vercel diese Umgebungsvariable setzen:

```env
NEXT_PUBLIC_API_URL=https://projektmanagement.runasp.net/api/v1
```

Wichtig:

- immer mit `/api/v1` enden
- nicht auf `localhost` zeigen
- Production, Preview und Development in Vercel jeweils sauber setzen

Vercel Import:

- Repository: `DevBerkcan/PMTool_UI`
- Root Directory: `.`
- Build Command: `npm run build`
- Output: automatisch durch Next.js

## Build pruefen

```bash
npx tsc --noEmit
npm run build
```

## Projektstruktur

- `app/` App Router Seiten
- `components/` UI und Feature-Komponenten
- `lib/api.ts` API-Client
- `lib/store/` Client State
- `types/` gemeinsame Frontend-Typen

## Login

Demo-Login gegen das aktuelle Backend:

- E-Mail: `berkcan@realcore.de`
- Passwort: `demo1234`
