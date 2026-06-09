# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FloraHub is a multi-city flower **marketplace**: florist sellers receive orders in a
seller console; customers browse a catalog, order, and track delivery status.
Trilingual (KK/RU/EN), light/dark themes, SMS-code auth.

```
florahub/
├── frontend/   React 18 + TypeScript + Vite + Tailwind SPA
├── backend/    PHP 8.1 REST API (PDO/MySQL)
└── index.js    legacy placeholder from the initial scaffold (unused)
```

The frontend runs **standalone on in-browser mock data** (`frontend/src/data/mock.ts`)
and only talks to the PHP backend when `VITE_USE_REAL_API=true`.

## Commands

Frontend (run from `frontend/`):
- `npm install` — install deps
- `npm run dev` — Vite dev server on :5173 (proxies `/api` → :8000)
- `npm run build` — `tsc -b` typecheck + production build
- `npm run preview` — serve the production build

Backend (run from `backend/`, requires PHP 8.1+):
- `cp config/config.example.php config/config.php` then set DB credentials
- `php -S localhost:8000 -t public` — dev server
- DB setup: `mysql … < database/schema.sql` then `< database/seed.sql`
- No Composer needed at runtime — `public/index.php` registers a PSR-4 autoloader.

## Architecture notes

- **Design tokens**: semantic colors as CSS variables (RGB channels) in
  `frontend/src/index.css`, consumed via Tailwind (`tailwind.config.js`). Brand =
  forest green `#15803D` + floral pink `#EC4899`. Dark mode via `.dark` class.
- **i18n**: `react-i18next`; dictionaries in `frontend/src/i18n/locales/`. Use the
  `useLocale()` hook's `lz()` helper to resolve `Localized` objects.
- **State**: `zustand` stores in `frontend/src/store/` (theme, city, cart, auth), all
  persisted to localStorage.
- **API boundary**: `frontend/src/lib/api.ts` — swap mock⇄PHP via `VITE_USE_REAL_API`.
- **Routing**: `frontend/src/App.tsx`. Public pages share `Layout`; `/admin/*` and
  `/seller/*` use `ConsoleLayout` (their own chrome). Pages are lazy-loaded.
- **Backend**: front controller `backend/public/index.php` → `Router` → controllers in
  `src/Controllers/`. `Serializer` maps DB rows to the JSON shapes the frontend expects.

## Demo conventions

- SMS login code in mock mode is always `1234`. A phone ending `123 45 67` seeds order history.
- `/admin` and `/seller` are open in mock mode for demoing; gate them by role when wiring real auth.
