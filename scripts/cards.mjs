// Draws assets/languages.svg and assets/activity.svg in pixel style from public GitHub data.
//   GITHUB_TOKEN=... node scripts/cards.mjs [username]
// Runs daily from .github/workflows/cards.yml. No dependencies (Node 20+).
import { writeFileSync } from "node:fs";
import { rasterText, textWidth } from "./font.mjs";

const USER = process.argv[2] ?? "kilianvega-dev";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is missing");

const BG = "#0b0d17", EDGE = "#26164f", TITLE = "#9af7bf", TEXT = "#c9c3dd", DIM = "#6b6488";
const LANG = ["#3fd88e", "#9c62e8", "#1fa06a", "#d2b4ff", "#13664e", "#6a34c0"]; // aurora colors from the banner
const LEVEL = { NONE: "#161a2b", FIRST_QUARTILE: "#0d3a36", SECOND_QUARTILE: "#13664e", THIRD_QUARTILE: "#1fa06a", FOURTH_QUARTILE: "#3fd88e" };

async function api(path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "User-Agent": "profile-cards", Accept: "application/vnd.github+json" },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`${path}: ${JSON.stringify(json.errors)}`);
  return json;
}

// One SVG in art pixels; every pixel of one color goes into one path, scaled up crisp by the browser.
function card(w, h, draw) {
  const paths = {};
  const px = (x, y, c) => (paths[c] ??= []).push(`M${x} ${y}h1v1h-1z`);
  const rect = (x, y, rw, rh, c) => (paths[c] ??= []).push(`M${x} ${y}h${rw}v${rh}h${-rw}z`);
  const text = (s, x, y, c) => rasterText(s, "mini", (gx, gy) => px(x + gx, y + gy, c));
  rect(0, 0, w, h, EDGE);
  rect(1, 1, w - 2, h - 2, BG);
  draw({ rect, text });
  const body = Object.entries(paths).map(([c, d]) => `<path fill="${c}" d="${d.join("")}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}" shape-rendering="crispEdges">${body}</svg>\n`;
}

// ---- languages: bytes of code over your own public repos (forks left out)
const repos = (await api(`/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork && !r.archived);
const bytes = {};
for (const r of repos) for (const [lang, n] of Object.entries(await api(`/repos/${r.full_name}/languages`))) bytes[lang] = (bytes[lang] ?? 0) + n;
const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
const top = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n], i) => ({ name, pct: (n / total) * 100, c: LANG[i] }));

const W = 320, PAD = 8, BAR = W - PAD * 2;
writeFileSync("assets/languages.svg", card(W, 52, ({ rect, text }) => {
  text("LANGUAGES", PAD, PAD, TITLE);
  text(`${repos.length} PUBLIC REPOS`, W - PAD - textWidth(`${repos.length} PUBLIC REPOS`), PAD, DIM);
  let x = PAD;
  for (const [i, l] of top.entries()) {
    const seg = i === top.length - 1 ? PAD + BAR - x : Math.round((l.pct / 100) * BAR); // last one fills the bar
    rect(x, 19, seg, 5, l.c);
    x += seg;
  }
  for (const [i, l] of top.entries()) {
    const cx = PAD + (i % 3) * 102, cy = 31 + Math.floor(i / 3) * 9;
    rect(cx, cy, 5, 5, l.c);
    text(`${l.name} ${l.pct.toFixed(0)}%`, cx + 8, cy, TEXT);
  }
}));

// ---- activity: the contribution calendar of the last year
const q = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionLevel}}}}}}`;
const cal = (await api("/graphql", { query: q, variables: { u: USER } })).data.user.contributionsCollection.contributionCalendar;
const weeks = cal.weeks.slice(-53), CELL = 5, GRID = weeks.length * CELL - 1;
writeFileSync("assets/activity.svg", card(W, 60, ({ rect, text }) => {
  text("ACTIVITY", PAD, PAD, TITLE);
  const label = `${cal.totalContributions} CONTRIBUTIONS IN THE LAST YEAR`;
  text(label, W - PAD - textWidth(label), PAD, DIM);
  const x0 = Math.round((W - GRID) / 2);
  for (const [wi, w] of weeks.entries())
    for (const [di, d] of w.contributionDays.entries()) rect(x0 + wi * CELL, 19 + di * CELL, CELL - 1, CELL - 1, LEVEL[d.contributionLevel] ?? LEVEL.NONE);
}));

console.log(`languages: ${top.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}`);
console.log(`activity: ${cal.totalContributions} contributions, ${weeks.length} weeks`);
