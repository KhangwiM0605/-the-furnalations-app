THE FURNALATIONS — STARTER WEBSITE

Files:
- index.html: page content and layout
- style.css: visual design and responsive layout
- script.js: rule search, category filters, random rule, and saved rules

How to run:
1. Extract The_Furnalations.zip.
2. Open the extracted folder in VS Code.
3. Open index.html in a browser, or use the Live Server extension.
4. You do not need npm or a backend for this starter version.

Notes:
- Saved rules use browser localStorage on the current device/browser.
- Google Fonts require an internet connection; fallback fonts are included.
- This is a front-end prototype. Accounts, cloud-synced bookmarks, and user-submitted rules would need a backend/database.


BROTHERHOOD STREAK (NEW)
- Open the Daily Check-in section to see current streak, personal best, total check-ins and the monthly calendar.
- Check in once per South African calendar day (Africa/Johannesburg). An optional reflection can be saved with the check-in.
- Data is saved in this browser using localStorage. This prototype is device/browser-specific and is not synced to other members. Clearing browser data may erase it.
- For an app with member accounts and shared streaks, use the included supabase-schema.sql as a starting point for cloud storage. The production app should calculate and validate streaks using server/database logic, not trust browser-calculated values.

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
The streak and challenge logic is still a front-end prototype. Before a public multi-user launch, move validation to a backend/database and add authentication, database access policies, backups, and server-side date validation.

INSTALL AS A FREE PHONE APP (PWA)
- This project is a Progressive Web App. It can be installed from a website without paying app-store developer fees.
- Publish the entire project folder to a free static host with HTTPS. GitHub Pages is one free option: create a public GitHub repository, upload the project files, then open the repository's Settings > Pages and select the main branch and root folder.
- Keep index.html, manifest.webmanifest, sw.js, style.css, script.js and the assets folder together in the published site.
- After GitHub Pages finishes publishing, open its HTTPS site on Android in Chrome and select Install app (or use the Install app button on the page).
- On iPhone, open the HTTPS site in Safari, tap Share, then Add to Home Screen.
- The first online visit caches the app shell for later offline launches. Google Fonts need internet access; the site falls back to local fonts offline.
- Saved check-ins, reflections, challenges, and bookmarks remain on the device/browser and do not sync to other devices.
- For local development, use VS Code Live Server or another localhost server. Opening index.html directly as a file does not enable service workers or installation.
