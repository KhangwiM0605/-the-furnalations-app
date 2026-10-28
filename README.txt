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
- The MongoDB account API supports sign-up and sign-in after it is configured and deployed. Check-ins, reflections, challenges, and saved rules are still device-local.


BROTHERHOOD STREAK (NEW)
- Open the Daily Check-in section to see current streak, personal best, total check-ins and the monthly calendar.
- Check in once per South African calendar day (Africa/Johannesburg). An optional reflection can be saved with the check-in.
- Data is saved in this browser using localStorage. This prototype is device/browser-specific and is not synced to other members. Clearing browser data may erase it.
- Account sign-in is available through the MongoDB API described below. Shared streaks and other cloud-synced progress are not implemented; production progress tracking should be validated by the server, not trusted to browser-calculated values.

RUN LOCALLY
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Use the Live Server extension to open index.html. The site can also open directly in a modern browser, but a local web server is recommended for app-like development.


DASHBOARD + DAILY FORGE UPGRADE
- The Dashboard shows current streak, total check-ins, and completed challenges.
- The Forge displays a date-based daily challenge and a rotating Scripture of the Day.
- Marking a challenge complete is saved in localStorage and can be done once per date.
- Achievement badges unlock from your check-in streak and challenge count.
- All progress remains local to the current browser/device. It does not sync between devices or members yet.
- Daily dates use Africa/Johannesburg (South African time).

APP-READY NOTE
The streak and challenge logic is still a front-end prototype. The account API is a separate starting point; progress syncing, server-side date validation, database access policies, and backups still need to be implemented before a public multi-user launch.

INSTALL AS A FREE PHONE APP (PWA)
- This project is a Progressive Web App. It can be installed from a website without paying app-store developer fees.
- Publish the entire project folder to a free static host with HTTPS. GitHub Pages is one free option: create a public GitHub repository, upload the project files, then open the repository's Settings > Pages and select the main branch and root folder.
- Keep index.html, manifest.webmanifest, sw.js, style.css, script.js and the assets folder together in the published site.
- After GitHub Pages finishes publishing, open its HTTPS site on Android in Chrome and select Install app (or use the Install app button on the page).
- On iPhone, open the HTTPS site in Safari, tap Share, then Add to Home Screen.
- The first online visit caches the app shell for later offline launches. Google Fonts need internet access; the site falls back to local fonts offline.
- Saved check-ins, reflections, challenges, and bookmarks remain on the device/browser and do not sync to other devices.
- The Daily Check-in section includes a private on-device reflection journal and progress bars toward each achievement.
- Account setup (MongoDB + Node.js API)
  1. Install Node.js 20 or newer, then run `npm install` in this folder.
  2. Create a MongoDB Atlas database and a database user with access only to the app database. Copy `.env.example` to `.env` and set `MONGODB_URI`, `MONGODB_DB`, and a random `JWT_SECRET` of at least 32 characters (generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Keep `.env` private; it is ignored by Git.
  3. In Atlas Network Access, allow connections from your API host. Avoid broad IP access when your host supports fixed outbound IPs.
  4. Set `FRONTEND_ORIGIN` to the exact HTTPS website origin (for GitHub Pages, `https://khangwim0605.github.io`, without the repository path). Run locally with `npm start`; the API listens on port 3000 by default.
  5. Deploy this repository as a Node web service on a host that supports Node.js. Use `npm install` as the build command and `npm start` as the start command. Set the environment variables from `.env` in the host's private dashboard; never commit them.
  6. Set `window.FURNALATIONS_API_BASE_URL` in `auth-config.js` to the deployed API's HTTPS origin (for example `https://your-api.example.com`, with no trailing slash), then publish that frontend change.
  7. Check `https://your-api.example.com/api/health`, then try account creation and sign-in on `login.html`.
- Sign-up hashes passwords with bcrypt. Access tokens expire after one hour and are held in the current browser tab. Email verification and password reset are not configured.
- The account API authenticates users; it does not yet sync check-ins, reflections, challenges, or saved rules. Those remain local to each device.
- Authentication needs an online API; the static app shell can open offline, but sign-up and sign-in cannot work without a network connection.
- For local development, use VS Code Live Server or another localhost server. Opening index.html directly as a file does not enable service workers or installation.
