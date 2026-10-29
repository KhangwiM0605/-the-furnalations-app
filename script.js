const rules = [
  {id:1, category:"faith", number:"001", label:"FAITH & PURPOSE", title:"Keep God above all.", quote:"Never allow the pursuit of a woman, the weight of heartbreak, the hunger for success, or the opinions of men to take the place of God in your life. Before you seek a woman’s heart, seek God’s presence. Before you chase your purpose, seek His direction. And when life brings you to your knees, let it be before the One who can restore what the world could never give you. A man grounded in God may bend beneath the pressure of life, but he will never have to walk through the fire alone."},
  {id:2, category:"heartbreak", number:"002", label:"HEARTBREAK CODE", title:"Missing her is not a reason to return.", quote:"Your heart can miss what your peace had to escape. Let both truths exist without letting loneliness make the decision."},
  {id:3, category:"discipline", number:"003", label:"THE MAN WITHIN", title:"Keep the promises you make to yourself.", quote:"Self-respect grows quietly each time you do what you said you would do, especially when nobody is watching."},
  {id:4, category:"brotherhood", number:"004", label:"BROTHERHOOD", title:"Be a safe place, not another battle.", quote:"A real brother does not make you earn the right to be honest. He listens without turning your wounds into a weakness."},
  {id:5, category:"heartbreak", number:"005", label:"HEARTBREAK CODE", title:"Heal without becoming cruel.", quote:"One person's inability to love you well is not permission to punish the next person who tries."},
  {id:6, category:"faith", number:"006", label:"FAITH & PURPOSE", title:"Do not confuse a difficult season with a finished story.", quote:"The fire may change you, but it does not get to write the final chapter. Keep walking with faith and wisdom."},
  {id:7, category:"discipline", number:"007", label:"THE MAN WITHIN", title:"Discipline is self-respect in action.", quote:"Build a life you do not constantly need to escape from. Start small, stay honest, and keep showing up."},
  {id:8, category:"brotherhood", number:"008", label:"BROTHERHOOD", title:"Celebrate your brother without competing with him.", quote:"His progress is not proof of your failure. There is room at the table for every man who is willing to grow."},
  {id:9, category:"faith", number:"009", label:"FAITH & PURPOSE", title:"Let faith steady you, not excuse you from action.", quote:"Pray for direction, then take the next honest step. Faith and responsibility can walk side by side."},
  {id:10, category:"heartbreak", number:"010", label:"HEARTBREAK CODE", title:"Closure does not always come with an apology.", quote:"Sometimes peace begins when you stop waiting for someone else to explain the pain they caused."},
  {id:11, category:"brotherhood", number:"011", label:"BROTHERHOOD", title:"Check on the brother who checks on everyone.", quote:"The strongest friend in the room may still need someone to ask, and mean it, 'How are you really doing?'"},
  {id:12, category:"discipline", number:"012", label:"THE MAN WITHIN", title:"Your future needs your attention more than your excuses.", quote:"You do not have to fix your whole life today. Give your future one good decision, then repeat."}
];

const grid = document.getElementById("rulesGrid");
const search = document.getElementById("ruleSearch");
const emptyState = document.getElementById("emptyState");
const accountSessionStorageKey = "furnalations-account-session";
function readAccountSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(accountSessionStorageKey) || "null");
    if (session?.accessToken && typeof session.user?.id === "string"
      && Number.isFinite(session.expiresAt) && session.expiresAt > Date.now()) return session;
  } catch (error) {
    console.error("Could not read the account session for progress sync:", error);
  }
  return null;
}
const accountSession = readAccountSession();
const accountStoragePrefix = accountSession
  ? `furnalations-account-${encodeURIComponent(accountSession.user.id)}`
  : "furnalations";
const progressApiBaseUrl = (window.FURNALATIONS_API_BASE_URL
  || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:3000" : ""))
  .replace(/\/+$/, "");
const accountProgressPendingKey = accountSession ? `${accountStoragePrefix}-progress-pending` : "";
const mainContent = document.querySelector("main");
if (accountSession) {
  mainContent.inert = true;
  mainContent.setAttribute("aria-busy", "true");
}
const savedKey = accountSession ? `${accountStoragePrefix}-saved-rules` : "furnalations-saved-rules";
let activeFilter = "all";
let saved = new Set();
try {
  const storedSavedRules = JSON.parse(localStorage.getItem(savedKey) || "[]");
  if (Array.isArray(storedSavedRules)) saved = new Set(storedSavedRules.filter(id => Number.isInteger(id) && rules.some(rule => rule.id === id)));
} catch (error) { saved = new Set(); }

function updateSavedCount() {
  document.getElementById("savedCount").textContent = saved.size;
}
function renderRules() {
  const query = search.value.trim().toLowerCase();
  const visible = rules.filter(rule => {
    const matchesFilter = activeFilter === "all" || (activeFilter === "saved" ? saved.has(rule.id) : rule.category === activeFilter);
    const matchesQuery = `${rule.title} ${rule.quote} ${rule.label} ${rule.number}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  grid.innerHTML = visible.map(rule => `
    <article class="rule-card ${rule.id === 1 ? "featured" : ""}" data-category="${rule.category}">
      <div class="rule-top"><span>RULE ${rule.number}</span><span class="rule-symbol">${rule.id % 2 ? "✳" : "↗"}</span></div>
      <p class="rule-category">${rule.label}</p>
      <h3>${escapeHtml(rule.title)}</h3>
      <p class="rule-quote">“${escapeHtml(rule.quote)}”</p>
      <div class="rule-bottom"><span>READ · REFLECT · RISE</span><button class="save-rule ${saved.has(rule.id) ? "saved" : ""}" aria-label="${saved.has(rule.id) ? "Unsave" : "Save"} rule ${rule.id}" data-id="${rule.id}">${saved.has(rule.id) ? "♥" : "♡"}</button></div>
    </article>`).join("");
  emptyState.hidden = visible.length !== 0;
  updateSavedCount();
}
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}
const installButton = document.getElementById("installApp");
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let deferredInstallPrompt = null;
if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true) {
  installButton.hidden = true;
} else if (isIos) {
  installButton.hidden = false;
  installButton.innerHTML = 'Add to Home Screen <span>↓</span>';
}
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
  installButton.innerHTML = 'Install app <span>↓</span>';
});
installButton.addEventListener("click", async () => {
  if (isIos) {
    toast("Tap Share in Safari, then choose Add to Home Screen.");
    return;
  }
  if (!deferredInstallPrompt) {
    toast("Open your browser menu and choose Install app or Add to Home screen.");
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (outcome === "accepted") installButton.hidden = true;
});
window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  deferredInstallPrompt = null;
});
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(error => {
    console.error("Service worker registration failed:", error);
    toast("Offline app setup failed. Please reload the hosted HTTPS site.");
  });
}
function randomRule() {
  const rule = rules[Math.floor(Math.random() * rules.length)];
  document.getElementById("randomTitle").textContent = rule.title;
  document.getElementById("randomText").textContent = rule.quote;
  document.getElementById("randomPanel").scrollIntoView({behavior:"smooth", block:"center"});
}
grid.addEventListener("click", event => {
  const button = event.target.closest(".save-rule");
  if (!button) return;
  const id = Number(button.dataset.id);
  const previousSaved = new Set(saved);
  if (saved.has(id)) { saved.delete(id); toast("Rule removed from your saved list."); }
  else { saved.add(id); toast("Rule saved. Keep it close, brother."); }
  try {
    localStorage.setItem(savedKey, JSON.stringify([...saved]));
  } catch (error) {
    saved = previousSaved;
    toast("Could not save this rule. Check your browser storage settings.");
    renderRules();
    return;
  }
  scheduleProgressSync();
  renderRules();
});
document.querySelectorAll(".filter-btn").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.filter;
  renderRules();
}));
search.addEventListener("input", renderRules);
document.getElementById("randomButton").addEventListener("click", randomRule);
document.getElementById("heroRandom").addEventListener("click", randomRule);
document.querySelectorAll(".chapter-row").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.chapter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === activeFilter));
  search.value = "";
  renderRules();
  document.getElementById("book").scrollIntoView({behavior:"smooth"});
}));
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "×" : "☰";
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "☰";
}));
document.getElementById("year").textContent = new Date().getFullYear();
renderRules();


// Brotherhood streak prototype. Dates are always calculated in South African time.
const checkinStorageKey = accountSession
  ? `${accountStoragePrefix}-daily-checkins-v1`
  : "furnalations-daily-checkins-v1";
const checkinButton = document.getElementById("checkinButton");
const reflectionInput = document.getElementById("dailyReflection");
const calendarEl = document.getElementById("checkinCalendar");
let calendarCursor = (() => { const today = getSouthAfricanDateKey(); return { year: Number(today.slice(0,4)), month: Number(today.slice(5,7)) - 1 }; })();

function getSouthAfricanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function shiftDateKey(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
}
function loadCheckins() {
  try {
    const value = JSON.parse(localStorage.getItem(checkinStorageKey) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
      .map(item => ({ date: item.date, reflection: typeof item.reflection === "string" ? item.reflection.slice(0,500) : "" }))
      .filter((item, index, all) => all.findIndex(other => other.date === item.date) === index)
      .sort((a,b) => a.date.localeCompare(b.date));
  } catch (error) { return []; }
}
let checkins = loadCheckins();
function saveCheckins() {
  try {
    localStorage.setItem(checkinStorageKey, JSON.stringify(checkins));
    scheduleProgressSync();
    return true;
  }
  catch (error) { toast("Could not save this check-in. Check your browser storage settings."); return false; }
}
function getStreakStats() {
  const dates = [...new Set(checkins.map(item => item.date))].sort();
  const today = getSouthAfricanDateKey();
  const yesterday = shiftDateKey(today, -1);
  let best = 0, run = 0, previous = null;
  for (const date of dates) {
    run = previous && shiftDateKey(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  let current = 0;
  if (dates.includes(today) || dates.includes(yesterday)) {
    let cursor = dates.includes(today) ? today : yesterday;
    const set = new Set(dates);
    while (set.has(cursor)) { current++; cursor = shiftDateKey(cursor, -1); }
  }
  return { current, best, total: dates.length, today, checkedToday: dates.includes(today), dates: new Set(dates) };
}
function renderStreak() {
  const stats = getStreakStats();
  document.getElementById("currentStreak").textContent = stats.current;
  document.getElementById("bestStreak").textContent = stats.best;
  document.getElementById("totalCheckins").textContent = stats.total;
  const status = document.getElementById("streakStatus");
  if (stats.checkedToday) status.textContent = `You have shown up today. ${stats.current > 1 ? `${stats.current} days of consistency.` : "Protect the habit by returning tomorrow."}`;
  else if (stats.current > 0) status.textContent = `Your streak is waiting for today's check-in. Keep it alive, brother.`;
  else if (stats.total > 0) status.textContent = "A new chapter starts with one honest step. Check in today.";
  else status.textContent = "Your first check-in starts here.";
  checkinButton.disabled = stats.checkedToday;
  checkinButton.innerHTML = stats.checkedToday ? 'Checked in today <span>✓</span>' : 'Check in for today <span>↗</span>';
  document.getElementById("checkinNote").textContent = stats.checkedToday
    ? "Today's check-in is saved on this device. Come back tomorrow to continue."
    : "One check-in per day · Days follow South African time.";
  const encouragement = document.getElementById("streakEncouragement");
  if (stats.current >= 30) encouragement.textContent = "Thirty days of showing up is no small thing. Keep building a life that reflects your values.";
  else if (stats.current >= 7) encouragement.textContent = "A week of consistency is a foundation. Stay humble, stay steady, keep going.";
  else if (stats.current > 0) encouragement.textContent = "Every return is a decision. Keep choosing the man you are becoming.";
  else encouragement.textContent = "You do not have to be perfect. You only have to be willing to begin.";
  renderCalendar(stats);
  renderReflectionHistory();
}
function renderReflectionHistory() {
  const list = document.getElementById("reflectionList");
  const reflections = checkins.filter(item => item.reflection.trim()).reverse();
  document.getElementById("reflectionCount").textContent = `${reflections.length} ${reflections.length === 1 ? "reflection" : "reflections"}`;
  document.getElementById("reflectionEmpty").hidden = reflections.length > 0;
  const entries = document.createDocumentFragment();
  reflections.forEach(item => {
    const entry = document.createElement("article");
    entry.className = "reflection-entry";
    const date = document.createElement("time");
    date.dateTime = item.date;
    date.textContent = new Date(`${item.date}T12:00:00+02:00`).toLocaleDateString("en-ZA", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg"
    });
    const reflection = document.createElement("p");
    reflection.textContent = item.reflection;
    entry.append(date, reflection);
    entries.append(entry);
  });
  list.replaceChildren(entries);
}
function renderCalendar(stats = getStreakStats()) {
  const {year, month} = calendarCursor;
  document.getElementById("calendarMonth").textContent = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-ZA", {month:"long", year:"numeric", timeZone:"UTC"});
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const currentMonthValue = Number(stats.today.slice(0,4)) * 12 + Number(stats.today.slice(5,7)) - 1;
  const displayedMonthValue = year * 12 + month;
  document.getElementById("prevMonth").disabled = displayedMonthValue <= 1900 * 12;
  document.getElementById("nextMonth").disabled = displayedMonthValue >= currentMonthValue;
  let html = "";
  for (let i=0; i<firstWeekday; i++) html += '<span class="calendar-day outside" aria-hidden="true"></span>';
  for (let day=1; day<=daysInMonth; day++) {
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const isFuture = key > stats.today;
    const isToday = key === stats.today;
    const checked = stats.dates.has(key);
    const classes = ["calendar-day", checked ? "checked" : "", isToday ? "today" : "", isFuture ? "future" : ""].filter(Boolean).join(" ");
    html += `<span class="${classes}" ${isToday ? 'aria-current="date"' : ""} title="${key}${checked ? " · Checked in" : ""}">${day}</span>`;
  }
  calendarEl.innerHTML = html;
}
checkinButton.addEventListener("click", () => {
  const today = getSouthAfricanDateKey();
  if (checkins.some(item => item.date === today)) { toast("You have already checked in today, brother."); renderStreak(); return; }
  checkins.push({date: today, reflection: reflectionInput.value.trim().slice(0,500)});
  checkins.sort((a,b) => a.date.localeCompare(b.date));
  if (!saveCheckins()) { checkins = loadCheckins(); return; }
  reflectionInput.value = "";
  const todayDate = new Date(`${today}T12:00:00+02:00`);
  calendarCursor = {year: todayDate.getFullYear(), month: todayDate.getMonth()};
  renderStreak();
  renderDashboard();
  toast("Check-in complete. Keep showing up, brother.");
});
document.getElementById("prevMonth").addEventListener("click", () => {
  calendarCursor.month--;
  if (calendarCursor.month < 0) { calendarCursor.month = 11; calendarCursor.year--; }
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  const today = getSouthAfricanDateKey();
  const maxValue = Number(today.slice(0,4))*12 + Number(today.slice(5,7))-1;
  const value = calendarCursor.year*12 + calendarCursor.month;
  if (value >= maxValue) return;
  calendarCursor.month++;
  if (calendarCursor.month > 11) { calendarCursor.month = 0; calendarCursor.year++; }
  renderCalendar();
});
renderStreak();


// Daily Forge challenge and achievement layer. All day keys use South African time.
const challengeStorageKey = accountSession
  ? `${accountStoragePrefix}-challenges-v1`
  : "furnalations-challenges-v1";
const challenges = [
  { title: "Keep your word.", description: "Choose one promise you have made to yourself and take a practical step to honour it today.", scripture: "“Let your yea be yea.” — Matthew 5:37 (KJV)" },
  { title: "Put God first.", description: "Set aside a few quiet minutes to pray or read Scripture before letting the noise of the day lead you.", scripture: "“But seek ye first the kingdom of God.” — Matthew 6:33 (KJV)" },
  { title: "Be a safe place.", description: "Check on someone sincerely. Listen to understand, not just to prepare your reply.", scripture: "“Bear ye one another’s burdens.” — Galatians 6:2 (KJV)" },
  { title: "Choose discipline over mood.", description: "Finish one useful task you have been avoiding. Begin with ten focused minutes if it feels heavy.", scripture: "“Whatsoever thy hand findeth to do, do it with thy might.” — Ecclesiastes 9:10 (KJV)" },
  { title: "Practise forgiveness with wisdom.", description: "Release the desire to retaliate. Keep the boundaries that protect peace and prevent repeated harm.", scripture: "“Be ye kind one to another, tenderhearted, forgiving one another.” — Ephesians 4:32 (KJV)" },
  { title: "Build your brother up.", description: "Give a brother honest encouragement or recognise progress without comparing his journey to yours.", scripture: "“Let us consider one another to provoke unto love and to good works.” — Hebrews 10:24 (KJV)" },
  { title: "Review the man you are becoming.", description: "Spend five minutes reflecting on one thing you did well and one thing you can improve tomorrow.", scripture: "“Examine yourselves, whether ye be in the faith.” — 2 Corinthians 13:5 (KJV)" }
];
const dailyVerses = [
  { verse: "“But seek ye first the kingdom of God, and his righteousness.”", reference: "MATTHEW 6:33 · KJV" },
  { verse: "“Be strong and of a good courage; be not afraid.”", reference: "JOSHUA 1:9 · KJV" },
  { verse: "“Let all your things be done with charity.”", reference: "1 CORINTHIANS 16:14 · KJV" },
  { verse: "“Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.”", reference: "PROVERBS 27:17 · KJV" },
  { verse: "“Commit thy works unto the LORD, and thy thoughts shall be established.”", reference: "PROVERBS 16:3 · KJV" },
  { verse: "“Let us not be weary in well doing.”", reference: "GALATIANS 6:9 · KJV" },
  { verse: "“The LORD is nigh unto them that are of a broken heart.”", reference: "PSALM 34:18 · KJV" }
];
function readChallengeHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(challengeStorageKey) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) { return {}; }
}
let challengeHistory = readChallengeHistory();
function saveChallengeHistory() {
  try {
    localStorage.setItem(challengeStorageKey, JSON.stringify(challengeHistory));
    scheduleProgressSync();
    return true;
  }
  catch (error) { toast("Could not save the challenge. Check your browser storage settings."); return false; }
}
function getChallengeForDate(dateKey) {
  const dayNumber = Math.floor(Date.UTC(...dateKey.split("-").map((part, index) => index === 1 ? Number(part)-1 : Number(part))) / 86400000);
  return challenges[((dayNumber % challenges.length) + challenges.length) % challenges.length];
}
function renderDailyForge() {
  const today = getSouthAfricanDateKey();
  const challenge = getChallengeForDate(today);
  const verse = dailyVerses[((Math.floor(Date.UTC(...today.split("-").map((part, index) => index === 1 ? Number(part)-1 : Number(part))) / 86400000) % dailyVerses.length) + dailyVerses.length) % dailyVerses.length];
  document.getElementById("challengeDate").textContent = new Date(`${today}T12:00:00+02:00`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" }).toUpperCase();
  document.getElementById("challengeTitle").textContent = challenge.title;
  document.getElementById("challengeDescription").textContent = challenge.description;
  document.getElementById("challengeScripture").textContent = challenge.scripture;
  document.getElementById("dailyVerse").textContent = verse.verse;
  document.getElementById("dailyVerseReference").textContent = verse.reference;
  const completed = challengeHistory[today] === true;
  const button = document.getElementById("completeChallenge");
  button.disabled = completed;
  button.innerHTML = completed ? "Challenge completed <span>✓</span>" : "Mark challenge complete <span>↗</span>";
  document.getElementById("challengeStatus").textContent = completed ? "You took action today. Carry the lesson into the rest of your day." : "Complete the action honestly, then mark it done. One step is enough to begin.";
}
function getChallengeCount() {
  return Object.values(challengeHistory).filter(value => value === true).length;
}
function rankLogo(image) {
  return `<img class="achievement-art" src="assets/ranks/${image}" alt="" aria-hidden="true" loading="lazy">`;
}
function renderAchievements(stats = getStreakStats()) {
  const challengeCount = getChallengeCount();
  const achievements = [
    { name: "First Flame", condition: "Complete your first check-in", rank: "flame", image: "first-flame.svg", progress: stats.total, goal: 1, progressLabel: "check-ins" },
    { name: "Disciplined", condition: "Reach a 7-day streak", rank: "disciplined", image: "disciplined.svg", progress: stats.best, goal: 7, progressLabel: "best streak" },
    { name: "Unshaken", condition: "Reach a 30-day streak", rank: "unshaken", image: "unshaken.svg", progress: stats.best, goal: 30, progressLabel: "best streak" },
    { name: "Iron Standard", condition: "Reach a 100-day streak", rank: "iron", image: "iron-standard.svg", progress: stats.best, goal: 100, progressLabel: "best streak" },
    { name: "Man of Action", condition: "Complete 10 daily challenges", rank: "action", image: "man-of-action.svg", progress: challengeCount, goal: 10, progressLabel: "challenges" }
  ];
  document.getElementById("achievementGrid").innerHTML = achievements.map(item => {
    const unlocked = item.progress >= item.goal;
    const progress = Math.min(item.progress, item.goal);
    const percentage = Math.round(progress / item.goal * 100);
    return `<article class="achievement-card ${unlocked ? "unlocked" : "locked"}" data-rank="${item.rank}"><span class="achievement-emblem">${rankLogo(item.image)}</span><p class="achievement-name">${item.name}</p><p class="achievement-condition">${item.condition}</p><div class="achievement-progress"><div class="achievement-progress-label"><span>${item.progressLabel}</span><span>${progress} / ${item.goal}</span></div><div class="achievement-progress-track" role="progressbar" aria-label="${item.name} progress" aria-valuemin="0" aria-valuemax="${item.goal}" aria-valuenow="${progress}"><span style="width:${percentage}%"></span></div></div><span class="achievement-state">${unlocked ? "UNLOCKED ✓" : "LOCKED"}</span></article>`;
  }).join("");
  document.getElementById("dashboardChallengesDone").textContent = challengeCount;
}
function renderDashboard() {
  const stats = getStreakStats();
  document.getElementById("dashboardCurrentStreak").textContent = stats.current;
  document.getElementById("dashboardTotalCheckins").textContent = stats.total;
  renderAchievements(stats);
}
document.getElementById("completeChallenge").addEventListener("click", () => {
  const today = getSouthAfricanDateKey();
  if (challengeHistory[today] === true) { renderDailyForge(); return; }
  challengeHistory[today] = true;
  if (!saveChallengeHistory()) { challengeHistory = readChallengeHistory(); return; }
  renderDailyForge();
  renderDashboard();
  toast("Challenge complete. Put the lesson into practice, brother.");
});
renderDailyForge();
renderDashboard();

let progressSyncReady = false;
let progressSyncTimer;
let progressSyncRevision = 0;
let progressSyncQueue = Promise.resolve();

function isValidProgressDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function getLocalProgressSnapshot() {
  return {
    checkins,
    challengeHistory,
    savedRules: [...saved]
  };
}

function normalizeProgress(value) {
  if (!value || typeof value !== "object") throw new Error("The account server returned invalid progress data.");
  const normalizedCheckins = Array.isArray(value.checkins)
    ? value.checkins.filter(item => item && isValidProgressDate(item.date) && typeof item.reflection === "string")
      .map(item => ({ date: item.date, reflection: item.reflection.slice(0, 500) }))
      .filter((item, index, all) => all.findIndex(other => other.date === item.date) === index)
      .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const normalizedChallenges = {};
  if (value.challengeHistory && typeof value.challengeHistory === "object" && !Array.isArray(value.challengeHistory)) {
    for (const [date, completed] of Object.entries(value.challengeHistory)) {
      if (isValidProgressDate(date) && completed === true) normalizedChallenges[date] = true;
    }
  }
  const normalizedSavedRules = Array.isArray(value.savedRules)
    ? [...new Set(value.savedRules.filter(id => Number.isInteger(id) && rules.some(rule => rule.id === id)))]
    : [];
  return {
    checkins: normalizedCheckins,
    challengeHistory: normalizedChallenges,
    savedRules: normalizedSavedRules
  };
}

function persistProgressSnapshot(snapshot) {
  try {
    localStorage.setItem(checkinStorageKey, JSON.stringify(snapshot.checkins));
    localStorage.setItem(challengeStorageKey, JSON.stringify(snapshot.challengeHistory));
    localStorage.setItem(savedKey, JSON.stringify(snapshot.savedRules));
  } catch (error) {
    throw new Error("Progress could not be saved in this browser. Check its storage settings.");
  }
}

async function putProgressSnapshot(snapshot) {
  const response = await fetch(`${progressApiBaseUrl}/api/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accountSession.accessToken}`
    },
    body: JSON.stringify(snapshot)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session expired. Sign in again to sync progress.");
    throw new Error(result?.error || "The account server could not save your progress.");
  }
}

function scheduleProgressSync() {
  if (!accountSession || !progressSyncReady) return;
  try {
    localStorage.setItem(accountProgressPendingKey, "true");
  } catch (error) {
    toast("Progress is saved on this device, but cloud sync could not be queued.");
    return;
  }

  progressSyncRevision++;
  const revision = progressSyncRevision;
  clearTimeout(progressSyncTimer);
  progressSyncTimer = setTimeout(() => {
    const snapshot = getLocalProgressSnapshot();
    progressSyncQueue = progressSyncQueue.then(async () => {
      await putProgressSnapshot(snapshot);
      if (revision === progressSyncRevision) localStorage.removeItem(accountProgressPendingKey);
    }).catch(error => {
      if (error.message.includes("session expired")) {
        progressSyncReady = false;
        mainContent.inert = true;
        mainContent.setAttribute("aria-busy", "true");
        try { sessionStorage.removeItem(accountSessionStorageKey); }
        catch (storageError) { console.error("Could not clear the expired account session:", storageError); }
      }
      toast(`${error.message} Your change remains saved on this device.`);
    });
  }, 400);
}

async function initializeAccountProgress() {
  if (!accountSession) return;
  if (!progressApiBaseUrl) {
    toast("The account API is not configured. Sign-in is needed before progress can sync.");
    return;
  }

  try {
    const response = await fetch(`${progressApiBaseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${accountSession.accessToken}` }
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new Error("Your session expired. Sign in again to load account progress.");
      throw new Error(result?.error || "Your account progress could not be loaded.");
    }

    if (localStorage.getItem(accountProgressPendingKey) === "true") {
      await putProgressSnapshot(getLocalProgressSnapshot());
      localStorage.removeItem(accountProgressPendingKey);
    } else {
      const snapshot = normalizeProgress(result.progress);
      persistProgressSnapshot(snapshot);
      checkins = snapshot.checkins;
      challengeHistory = snapshot.challengeHistory;
      saved = new Set(snapshot.savedRules);
    }

    progressSyncReady = true;
    mainContent.inert = false;
    mainContent.removeAttribute("aria-busy");
    renderRules();
    renderStreak();
    renderDailyForge();
    renderDashboard();
  } catch (error) {
    console.error("Account progress sync failed:", error);
    toast(`${error.message} Reload after the connection is fixed; account progress has not been replaced.`);
  }
}

initializeAccountProgress();
