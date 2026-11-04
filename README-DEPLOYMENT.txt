# Project Allocation — Netlify package

This package migrates the supplied Apps Script frontend/backend to:
- Static frontend: HTML, CSS, existing browser JavaScript
- Backend: Netlify Functions (Node.js)
- Database: the existing Google Spreadsheet via Google Sheets API

## Files
- `public/index.html` — application UI
- `public/assets/css/style.css` — extracted CSS plus responsive hamburger navigation
- `public/assets/js/app.js` — application frontend JavaScript and API client
- `public/setup.html` — one-time initializer for helper tabs and the first admin
- `netlify/functions/api.mjs` — API backend
- `netlify.toml` — Netlify build and Functions configuration
- `package.json` — dependency declaration

## Before deploying
1. Create a GitHub repository named `project-allocation` (or your preferred name).
2. Upload the complete contents of this folder to the repository root.
3. In Netlify, import that GitHub repository.
4. Set the site name to `project-allocation` or your chosen name. The display/site name can be changed later.
5. In Netlify: Site configuration → Environment variables, add:

### Required environment variables
- `SPREADSHEET_ID` = `1Ua7qm8jCaxTa6MnhLmIa1p8OKeL-dd0-tFPTW_0OTX8` (this ID is taken from the uploaded Code(3).gs)
- `GOOGLE_SERVICE_ACCOUNT_JSON` = the complete JSON credential for your Google Cloud Service Account
- `SESSION_SECRET` = a random secret string of at least 32 characters
- `SETUP_SECRET` = a separate random secret string used only for the one-time setup page

Use long random values for `SESSION_SECRET` and `SETUP_SECRET`. Do not commit credentials or secrets to GitHub.
After changing environment variables, trigger a new deploy.

## Google Sheets permission
Share the existing spreadsheet with the Service Account `client_email` address as Editor.
Enable Google Sheets API in the Google Cloud project. No Apps Script deployment is used.

## One-time initialization
1. After deploy, open `https://YOUR-SITE.netlify.app/setup.html`.
2. Enter the exact `SETUP_SECRET` configured in Netlify.
3. Enter a new admin password (at least 8 characters).
4. Click Initialize.
5. Open `https://YOUR-SITE.netlify.app/`.
6. Sign in with username `admin` and the password you chose.

The setup creates the `Users`, `Projects`, and `Audit_Log` helper tabs if missing. It creates the first admin only if Users has no existing user rows. It seeds Projects from existing RIAN, RAKA, VIO, ZIDNY, and GHIFARI tabs when Projects is empty. It does not recreate or overwrite the existing member tabs or reporting/pivot tabs.

## Important migration notes
- Existing spreadsheet ID was read from the uploaded `Code(3).gs`.
- Existing member sheet columns A:E and the helper sheet column layouts are retained.
- The app continues to use the original sheet names: `Users`, `Projects`, `Audit_Log`, `2026 Master All`, `Summary 2026`, `Master chart`, and member tabs.
- Existing data and formulas in reporting tabs are not rewritten by setup.
- The Apps Script-only `appsscript.json` is not needed by Netlify.
- The original Apps Script project should remain untouched until the Netlify version has been tested.
- Netlify Functions are stateless. Login sessions are signed tokens with a 6-hour expiry. Logging out clears the browser session; token expiry or deactivating a user invalidates access. Unlike Apps Script CacheService, this implementation does not maintain a server-side revocation list.
- The original Apps Script LockService is not available in Netlify Functions. Avoid simultaneous edits to the same member/date until a persistent locking mechanism is added if concurrent writes become common.
- For large spreadsheets, API reads may need pagination/caching optimization. This first migration prioritizes preserving existing behavior.
