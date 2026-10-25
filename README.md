# LifeLink 360

LifeLink 360 is a responsive frontend prototype for a Web Technology project about neighbors coordinating everyday community support. The dashboard includes sample community metrics, assistance requests, volunteer offers, community missions, search and filters, and a CSS 3D-style globe illustration.

## Run locally

1. Install Node.js (version 18 or newer).
2. Open a terminal in this folder.
3. Run `npm.cmd install` in PowerShell (or `npm install` in Command Prompt).
4. Open two terminals in this folder. In the first, run `npm.cmd run api` to start the backend at `http://localhost:4000`.
5. In the second, run `npm.cmd run dev` and open the local URL printed by Vite.

To create a production build, run `npm.cmd run build`; to preview it locally, run `npm.cmd run preview`.

## Project structure

- `src/App.jsx` — dashboard UI, API-backed interactions, and request form validation.
- `src/api.js` — frontend API client and anonymous demo participant ID.
- `backend/server.js` — Node.js API routes, local CORS handling, and server-side input validation.
- `backend/data.example.json` — clean sample data committed to GitHub.
- `backend/data.json` — local demo data, created from the example file when the API first runs; its changes stay out of Git.
- `src/styles.css` — responsive layout, visual design, motion, and accessibility adjustments.
- `src/main.jsx` — React entry point.
- `index.html` — page metadata and app mount point.

## Demo interactions

- **Ask for help** validates the form in the browser and again on the server, then stores the sample request in `backend/data.json`.
- **Offer help** posts to the API and updates the request's volunteer count.
- **Join mission** posts to the API and updates mission participation counts. A session-scoped anonymous ID prevents duplicate joins during the same browser session.
- Search and request tabs filter the visible sample requests.
- Navigation, notification, and profile controls provide small preview interactions.

## Frontend/backend integration readiness

The React frontend calls the local Node.js API at `http://localhost:4000`. The API exposes a health endpoint, dashboard data, request submission, request offers, and mission joins. The JSON file is a lightweight local persistence layer suitable for a classroom demo; it can later be replaced by a database and authenticated user accounts. The API validates fields independently of the browser form.

## Academic project scope

All initial counts and request details are illustrative. New demo requests and participation counts are stored locally in `backend/data.json`, and submission email addresses are validated but not stored. This project has no emergency dispatch, live GPS, payment, authentication, or real volunteer matching. It is not an emergency service. Use sample information only and do not enter sensitive personal information.

## GitHub organization suggestion

The repository ignores `node_modules`, generated `dist` files, local environment settings, and changing demo data. Commit the source files, README, lockfile, and `backend/data.example.json`. Never commit secrets or real user data.

### Publish this project to your GitHub account

1. Create a new **empty** repository on GitHub. Do not add a README or license there, since this folder already contains a README.
2. In PowerShell, open this project folder and run the following commands. Replace the URL with the HTTPS URL shown for your new GitHub repository.

```powershell
git init -b main
git add .
git commit -m "Initial LifeLink 360 project"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

If PowerShell blocks `npm`, use `npm.cmd` as shown in the local setup steps. The Git commands do not use PowerShell scripts.

A useful project presentation can cover the problem, user journey, form validation, responsive design, frontend/backend integration, and the boundary between the classroom demo and a real service.
