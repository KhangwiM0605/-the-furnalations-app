THE FURNALATIONS — STARTER WEBSITE

Files:
- index.html: page content and layout
- style.css: visual design and responsive layout
- script.js: rule search, category filters, random rule, and saved rules

How to run:
1. Extract The_Furnalations.zip.
2. Open the extracted folder in VS Code.
3. Open index.html in a browser, or use the Live Server extension.
4. You do not need npm for the static website. The optional MongoDB account API requires Node.js and the setup below.

Notes:
- Saved rules use browser localStorage on the current device/browser.
- Google Fonts require an internet connection; fallback fonts are included.
- The MongoDB account API supports account sign-up, sign-in, and online progress sync. Signed-out progress stays local to the current device/browser.


BROTHERHOOD STREAK (NEW)
- Open the Daily Check-in section to see current streak, personal best, total check-ins and the monthly calendar.
- Check in once per South African calendar day (Africa/Johannesburg). An optional reflection can be saved with the check-in.
- Signed-out data is saved in this browser using localStorage. When signed in and online, check-ins and reflections sync to the account API. Clearing browser data may erase signed-out progress.
- Account sign-in and progress sync use the MongoDB API described below. The API validates account ownership and progress shapes, but daily streak and challenge rules remain browser-calculated and should be validated server-side before being treated as authoritative.

RUN LOCALLY
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Use the Live Server extension to open index.html. The site can also open directly in a modern browser, but a local web server is recommended for app-like development.


DASHBOARD + DAILY FORGE UPGRADE
- The Dashboard shows current streak, total check-ins, and completed challenges.
- The Forge displays a date-based daily challenge and a rotating Scripture of the Day.
- Marking a challenge complete is saved in localStorage and can be done once per date.
- Achievement badges unlock from your check-in streak and challenge count.
- Signed-out progress stays local. When signed in and online, check-ins, reflections, challenges, and saved rules sync through the account API.
- Daily dates use Africa/Johannesburg (South African time).

APP-READY NOTE
Streak and challenge calculations still run in the browser. The API validates account ownership and progress shapes, but a production launch should also enforce date rules server-side and establish database backups and operational monitoring.

INSTALL AS A FREE PHONE APP (PWA)
- This project is a Progressive Web App. It can be installed from a website without paying app-store developer fees.
- Publish the entire project folder to a free static host with HTTPS. GitHub Pages is one free option: create a public GitHub repository, upload the project files, then open the repository's Settings > Pages and select the main branch and root folder.
- Keep index.html, manifest.webmanifest, sw.js, style.css, script.js and the assets folder together in the published site.
- After GitHub Pages finishes publishing, open its HTTPS site on Android in Chrome and select Install app (or use the Install app button on the page).
- On iPhone, open the HTTPS site in Safari, tap Share, then Add to Home Screen.
- The first online visit caches the app shell for later offline launches. Google Fonts need internet access; the site falls back to local fonts offline.
- Signed-out check-ins, reflections, challenges, and bookmarks remain on the device. Signing in loads the account's cloud progress; the account's cloud data replaces the signed-in progress cache on that device.
- The Daily Check-in section includes a private on-device reflection journal and progress bars toward each achievement.
- Account setup (MongoDB + Node.js API)
  1. Install Node.js 20 or newer, then run `npm install` in this folder.
  2. Create a MongoDB Atlas cluster (the Free tier is sufficient to start), then create a database user with read/write access only to the app database. In Atlas Network Access, allow the API host to connect. Avoid broad IP access when your host supports fixed outbound IPs.
  3. Copy `.env.example` to `.env` and set `MONGODB_URI`, `MONGODB_DB`, and a random `JWT_SECRET` of at least 32 characters (generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Keep `.env` private; it is ignored by Git.
  4. Set `FRONTEND_ORIGIN` to the exact HTTPS website origin (for GitHub Pages, `https://khangwim0605.github.io`, without the repository path). Run locally with `npm start`; the API listens on port 3000 by default.
  5. Deploy on Render by choosing New > Blueprint and connecting this repository. `render.yaml` configures the free Node web service, health check, and required environment variables. Enter `MONGODB_URI` in Render's private prompt; `JWT_SECRET` is generated automatically. If your website uses a different domain, change `FRONTEND_ORIGIN` in the Render dashboard to that exact HTTPS origin. Render's free service sleeps after 15 minutes without traffic, so its first request afterward can take about a minute.
  6. After Render deploys, set `window.FURNALATIONS_API_BASE_URL` in `auth-config.js` to the API's HTTPS origin (for example `https://your-api.onrender.com`, with no trailing slash), then publish that frontend change.
  7. In Render's service dashboard, open Connect > Outbound and add the listed IP ranges to MongoDB Atlas Network Access. Then check `https://your-service.onrender.com/api/health` and try account creation, sign-in, and progress sync on `login.html` and the dashboard.
- Sign-up hashes passwords with bcrypt. Access tokens expire after one hour and are held in the current browser tab.
- Email verification uses Resend. Create a Resend account, verify a sender domain/address, then set `RESEND_API_KEY` and `EMAIL_FROM` in Render's private environment settings. Set `FRONTEND_URL` to the published site base URL (including its repository path and trailing slash). Email verification activates automatically when all three settings are present; without them, account signup and sign-in continue without verification.
- New accounts must follow the one-time verification link sent by email before signing in. Verification links expire after 24 hours; users can request a resend from the sign-in page. Existing accounts are kept verified during the migration. Email sending is not enabled until the Resend sender and API key are configured.
- Password reset is not configured.
- The account API authenticates users and stores check-ins, reflections, completed challenges, and saved rules per account at `GET`/`PUT /api/progress`. Sync requires the API to be configured and online.
- On sign-in, cloud progress replaces that account's local progress cache. Signed-out progress is kept separately on the device and is not automatically merged into the account.
- Authentication needs an online API; the static app shell can open offline, but sign-up and sign-in cannot work without a network connection.
- For local development, use VS Code Live Server or another localhost server. Opening index.html directly as a file does not enable service workers or installation.
