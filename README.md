# LifeLink 360

LifeLink 360 is a responsive frontend prototype for a Web Technology project about neighbors coordinating everyday community support. The dashboard includes sample community metrics, assistance requests, volunteer offers, community missions, search and filters, and a CSS 3D-style globe illustration.

## Run locally

1. Install Node.js 20.19 or newer.
2. Open a terminal in this folder.
3. Run `npm.cmd install` in PowerShell (or `npm install` in Command Prompt).
4. Open two terminals in this folder. In the first, run `npm.cmd run api` to start the backend at `http://localhost:4000`.
5. In the second, run `npm.cmd run dev` and open the local URL printed by Vite.

To create a production build, run `npm.cmd run build`; to preview it locally, run `npm.cmd run preview`.

## Project structure

- `src/App.jsx` — dashboard UI, API-backed interactions, and request form validation.
- `src/api.js` — frontend API client and anonymous demo participant ID.
- `backend/server.js` — Node.js API routes, local CORS handling, validation, and MongoDB or JSON startup.
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

## MongoDB setup (optional)

The React frontend calls the local Node.js API at `http://localhost:4000`. The API exposes a health endpoint, dashboard data, request submission, request offers, and mission joins. By default, it uses `backend/data.json`. To switch to MongoDB Atlas:

1. Create an Atlas cluster and a database user. Add your current IP address to the cluster's network access list.
2. Copy `.env.example` to `.env` in this project folder.
3. Replace `MONGODB_URI` in `.env` with the connection string from Atlas. Keep the URI private; `.env` is ignored by Git.
4. Run `npm.cmd install` if you have not installed the new MongoDB driver, then restart the API with `npm.cmd run api`.

When `MONGODB_URI` is set, the API connects with the official MongoDB Node.js driver and stores the demo dashboard state in the `appState` collection of the `lifelink360` database. The sample data is inserted the first time that collection is empty. Without a URI, the API continues using the local JSON file. The browser still talks only to the Node API, so database credentials never go into the React app.

The API validates fields independently of the browser form. The JSON file is a lightweight local fallback; both storage modes are intended for this classroom prototype.

## Deploy a live demo (optional)

The app can use a hosted API and frontend while keeping the MongoDB URI on the backend:

1. For example, create a [Render Web Service](https://render.com/docs/web-services) connected to this repository. Use `npm install` as the build command and `npm run api` as the start command. Set its health check path to `/api/health`.
2. Add these private API environment variables in the hosting dashboard: `MONGODB_URI`, `MONGODB_DB_NAME=lifelink360`, and `FRONTEND_ORIGIN` set to the frontend's exact public origin (for example, `https://your-site.example`). The API listens on the host-provided `PORT` automatically.
3. Import the repository into [Vercel](https://vercel.com/docs/frameworks/frontend/vite) as a Vite frontend. Set `VITE_API_BASE_URL` to the API's public base URL, without a trailing slash, then rebuild/redeploy the frontend.
4. Add the backend host's outbound IP address or addresses to the MongoDB Atlas network access list. Add only the frontend origin to `FRONTEND_ORIGIN`; separate multiple allowed origins with commas.
5. Open the frontend URL and check that `/api/health` reports `mongodb` storage and that dashboard actions work.

Never set `MONGODB_URI` as a `VITE_` variable or commit it to Git. Frontend `VITE_` variables are included in the browser build; keep database credentials on the API service only. Hosting providers may have their own build settings, sleep behavior, and outbound IP policies.

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
