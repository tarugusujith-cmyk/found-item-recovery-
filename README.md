# Lost & Found Item Recovery System

React + TypeScript + Vite + Tailwind CSS + React Router + Axios, with JSON Server as the local mock API.

## Run it

```bash
npm install
npm run dev      # starts JSON Server on :3001 and Vite on :5173
```

Open http://localhost:5173. To run them separately: `npm run api` and `npm run web`.
To reset the demo data, restore `db.json` from the original copy (JSON Server writes changes to it).

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lostfound.test | admin123 |
| Staff / verifier | staff@lostfound.test | staff123 |
| User | meera@lostfound.test | user123 |
| User | arjun@lostfound.test | user123 |

## Where things are

- `db.json` – resources: users, categories, lostReports, foundItems, matchSuggestions, claims, verifications, handovers, notifications, activityLogs
- `src/lib/api.ts` – Axios client and CRUD helpers (all data goes through JSON Server)
- `src/lib/matching.ts` – match scoring (category, keywords, place, date range) and suggestion creation
- `src/lib/services.ts` – activity logging and notifications
- `src/pages/` – one file per page; `src/components/` – layout, route guard, shared UI

## Flow to try

1. Log in as Meera, report a lost item. Matches are suggested automatically and appear under Search & matches.
2. Confirm a match, then submit a claim on the found item.
3. Log in as staff: open the claim in the Verification queue, request proof or approve.
4. As staff, record the handover under Handovers, then close the case.
5. Log in as admin for the dashboard, reports, users and categories.

Access is enforced in the UI only (JSON Server has no auth), which is fine for a mock-data project.

## Deploy (one service on Render)

`npm run build` then `npm start` serves the app and the API together (API under `/api`).

1. Push this folder to a GitHub repository.
2. On render.com choose New > Blueprint (it reads `render.yaml`) or New > Web Service with:
   - Build command: `npm install --include=dev && npm run build`
   - Start command: `npm start`
3. Open the URL Render gives you.

Notes
- On Render's free plan the disk is temporary, so data resets to `db.json` on each restart or redeploy. To keep data, add a persistent disk and set the env var `DB_PATH` to a file on it, for example `/var/data/db.json`.
- This is a demo setup. The API has no authentication, so anyone with the URL can read or change data, including the plain-text demo passwords. Don't put real data in it.
