// Actual React app + Chromium; API responses are fixtures, not a live database.
// Run with Vite on :5173: node --experimental-websocket tests/dashboard-ui-smoke.mjs
// Set VOCABFLOW_UI_PRODUCTION=1 to also check React's production lifecycle.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

if (typeof WebSocket === "undefined")
  throw new Error(
    "Node 20 needs --experimental-websocket for this browser check.",
  );
const browser =
  process.env.VOCABFLOW_CHROME ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
if (!browser) throw new Error("Set VOCABFLOW_CHROME to an installed Chromium.");
const artifacts = mkdtempSync(join(tmpdir(), "vocabflow-dashboard-ui-"));
const viteUrl = process.env.VOCABFLOW_VITE_URL ?? "http://127.0.0.1:5173";
const production = process.env.VOCABFLOW_UI_PRODUCTION === "1";
const dates = Array.from({ length: 91 }, (_, i) =>
  new Date(Date.UTC(2026, 6, 17 + i)).toISOString().slice(0, 10),
);
const heatmap = dates.map((date, i) => ({ date, count: i % 5 ? i % 35 : 0 }));
const memory = { total: 120, fresh: 20, learning: 40, stable: 60 };
const growth = dates.map((date, i) => ({
  date,
  count: Math.round((i * 2) / 3),
}));
const watchlist = [
  {
    id: "book",
    bookId: "book",
    title: "Oxford Word Skills",
    totalWords: 400,
    knownWords: 120,
    unknownWords: 10,
    hardWords: 4,
    notReadWords: 270,
    stableWords: 60,
    reviewedToday: 2,
    lastStudiedAt: "2026-10-15T08:00:00Z",
    dueCount: 6,
    estimatedDays: 20,
  },
];
const stats = {
  hasEvents: true,
  direction: "EN_TO_FA",
  totals: {
    reviews: 250,
    correct: 200,
    wrong: 50,
    hard: 30,
    easy: 170,
    lapses: 12,
    newIntroduced: 120,
    sessions: 20,
    studyMinutes: 95,
    activeDays: 12,
  },
  accuracy: 80,
  byMode: [
    { mode: "EN_TO_FA", reviews: 250, accuracy: 80 },
    { mode: "FA_TO_EN", reviews: 0, accuracy: 0 },
  ],
  memory,
  forgottenWords: 8,
  avgReviewsToStable: 6,
  hardestWords: [
    {
      wordId: "word",
      eng: "remember",
      per: "به یاد آوردن",
      hardCount: 4,
      wrongCount: 2,
    },
  ],
  records: {
    bestDayReviews: { date: dates.at(-1), count: 40 },
    bestDayMinutes: { date: dates.at(-1), minutes: 15 },
    bestWeekReviews: { weekStart: dates.at(-7), count: 95 },
    longestStreak: 7,
  },
  growth,
  daily: heatmap.slice(-30).map((day) => ({
    date: day.date,
    reviews: day.count,
    correct: day.count,
    minutes: 3,
  })),
  heatmap,
};
let scenario = "normal";
let reviewsToday = 2;
let statsRequests = 0;
let writes = 0;
const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {QueryClient,QueryClientProvider,focusManager} from '@tanstack/react-query'; import App from './src/App';
      import {SessionSummaryScreen} from './src/components/study/SessionSummaryScreen';
      import {AnimatedNumber} from './src/components/ui/animated-number';
      const client=new QueryClient({defaultOptions:{queries:{retry:false}}}); window.uiQueryClient=client;
      window.uiSetFocused=focused=>focusManager.setFocused(focused);
      const root=createRoot(document.getElementById('root'));
      window.uiRenderSummary=(saving)=>root.render(React.createElement(SessionSummaryScreen,
        {saving,onHome:()=>{},onPracticeHard:()=>{},hardPracticeCount:2,
          stats:{reviewedCount:14,correctCount:10,wrongCount:4,hardCount:2,skippedCount:1,newCount:4,durationSec:180}}));
      window.uiRenderCounter=(value,{below=false,strict=true,percent=false,key='counter'}={})=>root.render(
        React.createElement(strict?React.StrictMode:React.Fragment,null,
          React.createElement('div',{id:'counter-fixture',key,style:{paddingTop:below?1400:0}},
            React.createElement(AnimatedNumber,{value,percent}))));
      root.render(React.createElement(React.StrictMode,null,
        React.createElement(QueryClientProvider,{client},React.createElement(App))));`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  define: {
    "import.meta.env": "{}",
    "process.env.NODE_ENV": JSON.stringify(
      production ? "production" : "development",
    ),
  },
  plugins: [
    {
      name: "no-native-bootstrap",
      setup(builder) {
        builder.onResolve({ filter: /(?:^|\/)offline\/bootstrap$/ }, () => ({
          path: "bootstrap",
          namespace: "fixture",
        }));
        builder.onResolve(
          {
            filter:
              /(?:^|\/)lib\/(platform|notifications|safeArea|bazaarBilling)$/,
          },
          ({ path }) => ({
            path: path.split("/").at(-1),
            namespace: "fixture",
          }),
        );
        builder.onResolve({ filter: /(?:^|\/)offline\/repo$/ }, () => ({
          path: "repo",
          namespace: "fixture",
        }));
        builder.onResolve(
          { filter: /(?:^|\/)offline\/entitlement\.repo$/ },
          () => ({ path: "entitlement", namespace: "fixture" }),
        );
        builder.onResolve({ filter: /^@capacitor\/app$/ }, () => ({
          path: "app",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          contents: {
            bootstrap: "export const prepareNative=async()=>{};",
            platform: "export const isNative=()=>window.nativeFixture.enabled;",
            notifications:
              "export const initNotifications=()=>{}; export const rescheduleNotifications=()=>{}; export const beginStudySession=()=>{}; export const endStudySession=()=>{}; export const ensureNotificationPermission=async()=>true;",
            safeArea: "export const syncSafeAreaVars=()=>{};",
            app: `export const App={
              addListener:async()=>({remove:async()=>{}}),exitApp:async()=>{}
            };`,
            bazaarBilling: `export const BazaarBilling={
              addListener:async()=>({remove:async()=>{}}),
              getEnvironment:async()=>({wallTime:Date.now(),elapsedRealtime:performance.now(),bootId:'ui',online:window.nativeFixture.online}),
              getSubscribedProducts:async()=>{
                window.nativeFixture.queries++;
                return {purchases:[{productId:'month'}],clock:{wallTime:Date.now(),elapsedRealtime:performance.now(),bootId:'ui'}};
              },
              getConfiguration:async()=>{
                window.nativeFixture.configurations++;
                return {configured:true,products:[{plan:'monthly',sku:'month'}]};
              },
              getProducts:async()=>{
                window.nativeFixture.products++;
                return {products:[{sku:'month',price:'۱۰۰٬۰۰۰ ریال'}]};
              }
            };`,
            repo: `export const getDashboard=async()=>({
              stats:{watchlistCount:0,totalWordsLearned:0,reviewsToday:0,currentStreak:0,avgStudyMinutes:0,accuracyRate:0},
              watchlist:[],heatmap:[],queue:[],memory:{total:0,fresh:0,learning:0,stable:0},upcoming:[],hardWords:[],growth:[]
            });
            export const getStudyToday=async()=>({due:[],new:[],meta:{dueCount:0,newCount:0,dailyGoal:20,reviewedToday:0,introducedToday:0,hardTodayCount:0,hasPlans:false,direction:'EN_TO_FA',plans:[]}});`,
            entitlement: `export const getEntitlementSnapshot=async()=>{
              const f=window.nativeFixture;
              if(f.holdSnapshot)await new Promise(resolve=>{f.resolveSnapshot=resolve;});
              if(f.failSnapshot)throw new Error('snapshot unavailable');
              const expired=f.source==='bazaar'&&Date.now()>=f.deadline;
              const source=expired?'locked':f.source;
              return {
                evaluatedAt:Date.now(),hasPremiumAccess:source!=='locked',source,
                bazaarStatus:f.source==='bazaar'?(expired?'needs_verification':'cached_active'):f.status,
                bazaarProductIds:f.source==='bazaar'&&!expired?['month']:[],
                trialRemainingDays:f.trialRemainingDays,trialDayActive:f.trialDayActive,
                lastSuccessfulQueryAt:null,lastVerifiedActiveAt:null,
                offlineAccessUntil:f.source==='bazaar'?f.deadline:null,
                developerUntil:f.source==='developer'?Date.now()+86400000:null,clockSuspicious:false
              };
            };
            export const saveVerifiedSubscriptions=async()=>{
              window.nativeFixture.source='bazaar';window.nativeFixture.deadline=Date.now()+7*86400000;
              window.dispatchEvent(new Event('vocabflow:entitlement-changed'));
            };`,
          }[path],
          loader: "js",
        }));
      },
    },
  ],
});
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://fixture");
    if (request.url.startsWith("/api/")) {
      if (request.method !== "GET") writes++;
      if (scenario === "loading") await delay(800);
      if (scenario === "error") {
        response.writeHead(503, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ success: false, message: "fixture unavailable" }),
        );
        return;
      }
      const empty = scenario === "empty";
      const dashboard = {
        stats: {
          watchlistCount: empty ? 0 : 1,
          totalWordsLearned: empty ? 0 : 120,
          reviewsToday: empty ? 0 : reviewsToday,
          currentStreak: empty ? 0 : 7,
          avgStudyMinutes: empty ? 0 : 5,
          accuracyRate: empty ? 0 : 80,
        },
        watchlist: empty ? [] : watchlist,
        heatmap: empty ? [] : heatmap,
        queue: empty
          ? []
          : [{ bookId: "book", title: "Oxford Word Skills", dueCount: 6 }],
        memory: empty ? { total: 0, fresh: 0, learning: 0, stable: 0 } : memory,
        upcoming: dates
          .slice(-7)
          .map((date) => ({ date, count: empty ? 0 : 6 })),
        hardWords: empty ? [] : stats.hardestWords,
        growth: empty ? [] : growth.slice(-30),
      };
      const noQueue = ["done", "rest", "empty"].includes(scenario);
      const study = {
        due: [],
        new: [],
        meta: {
          dueCount: noQueue ? 0 : 6,
          newCount: noQueue ? 0 : 6,
          dailyGoal: 20,
          reviewedToday:
            scenario === "done"
              ? 14
              : scenario === "rest" || empty
                ? 0
                : reviewsToday,
          introducedToday: empty || scenario === "rest" ? 0 : 4,
          hardTodayCount: scenario === "done" ? 2 : 0,
          hasPlans: !empty,
          direction: "EN_TO_FA",
          plans: [],
        },
      };
      const emptyStats = {
        ...stats,
        hasEvents: false,
        memory: dashboard.memory,
        growth: [],
        daily: [],
        heatmap: [],
        totals: Object.fromEntries(
          Object.keys(stats.totals).map((key) => [key, 0]),
        ),
        hardestWords: [],
        accuracy: 0,
        forgottenWords: 0,
        avgReviewsToStable: 0,
        records: {
          bestDayReviews: null,
          bestDayMinutes: null,
          bestWeekReviews: null,
          longestStreak: 0,
        },
        byMode: stats.byMode.map((mode) => ({
          ...mode,
          reviews: 0,
          accuracy: 0,
        })),
      };
      if (url.pathname === "/api/stats") statsRequests++;
      const data =
        url.pathname === "/api/dashboard"
          ? dashboard
          : url.pathname === "/api/stats"
            ? empty
              ? emptyStats
              : stats
            : url.pathname === "/api/study/today"
              ? study
              : [];
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ success: true, data }));
      return;
    }
    if (url.pathname === "/app.js") {
      response.setHeader("Content-Type", "text/javascript");
      response.end(bundle.outputFiles[0].text);
      return;
    }
    if (/^\/(fonts|logo)\//.test(request.url)) {
      const asset = await fetch(`${viteUrl}${request.url}`);
      response.writeHead(asset.status, {
        "Content-Type":
          asset.headers.get("content-type") ?? "application/octet-stream",
      });
      response.end(Buffer.from(await asset.arrayBuffer()));
      return;
    }
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html lang="fa" dir="ltr"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="stylesheet" href="${viteUrl}/src/index.css?direct"></head><body><div id="root"></div>
      <script>localStorage.setItem('authUser',JSON.stringify({id:'ui',name:'کاربر',role:'USER'}));
      localStorage.setItem('accessToken','ui');localStorage.setItem('refreshToken','ui');
      localStorage.setItem('eng-theme',${JSON.stringify(url.searchParams.get("theme") ?? "light")});
      window.nativeFixture={enabled:${url.searchParams.get("native") === "1"},source:'bazaar',status:'unknown',deadline:Date.now()+7*86400000,trialRemainingDays:6,trialDayActive:false,online:false,queries:0,configurations:0,products:0};
      window.uiErrors=[];window.addEventListener('error',e=>window.uiErrors.push(e.message));
      window.addEventListener('unhandledrejection',e=>window.uiErrors.push(String(e.reason)));
      </script><script type="module" src="/app.js"></script></body></html>`);
  } catch (error) {
    response.statusCode = 500;
    response.end(String(error));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const child = spawn(
  browser,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${join(artifacts, "profile")}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
const pending = new Map();
let sequence = 0;
async function send(method, params = {}) {
  const id = ++sequence;
  const result = new Promise((resolve, reject) =>
    pending.set(id, { resolve, reject }),
  );
  socket.send(JSON.stringify({ id, method, params }));
  return result;
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
async function open(path, mode = "normal") {
  scenario = mode;
  await send("Page.navigate", { url: `${origin}${path}` });
  await until(
    "document.readyState==='complete' && !!document.querySelector('#app-scroll')",
  );
  await until(
    "!document.querySelector('[aria-busy=true]') && !!window.uiQueryClient && window.uiQueryClient.isFetching()===0",
  );
  await evaluate("document.fonts.ready.then(()=>true)");
  assert.deepEqual(await evaluate("window.uiErrors"), []);
}
async function screenshot(name) {
  await delay(700);
  const result = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(artifacts, name), Buffer.from(result.data, "base64"));
}
async function checkHeatmapLayout() {
  assert.deepEqual(
    await evaluate(`(()=>{
      const cells=document.querySelectorAll('.chart-heat-cell');
      const first=cells[0].getBoundingClientRect();
      const column=cells[0].parentElement.getBoundingClientRect();
      const selected=document.querySelector('.chart-heat-cell[aria-pressed="true"]');
      return {
        days:cells.length,
        startsActive:!cells[0].classList.contains('heat-0'),
        startsAtBottom:Math.abs(first.bottom-column.bottom)<1,
        nextDayAbove:cells[1].getBoundingClientRect().top<first.top,
        nextWeekRight:cells[7].getBoundingClientRect().left>first.left,
        selectedColor:getComputedStyle(selected).outlineColor,
      };
    })()`),
    {
      days: heatmap.length - heatmap.findIndex((day) => day.count > 0),
      startsActive: true,
      startsAtBottom: true,
      nextDayAbove: true,
      nextWeekRight: true,
      selectedColor: "rgb(131, 82, 33)",
    },
    "study activity starts at bottom left, climbs upwards and continues to the right with a bronze selection",
  );
}
async function noOverflow() {
  assert.equal(
    await evaluate(
      "document.querySelector('#app-scroll').scrollWidth <= document.querySelector('#app-scroll').clientWidth+1",
    ),
    true,
  );
}

async function sampleCounter(action, duration = 900) {
  return evaluate(`(async()=>{
    ${action};
    const frames=[];const started=performance.now();window.uiCounterWidths=[];
    await new Promise(resolve=>{
      const sample=()=>{
        const value=document.querySelector('#counter-fixture [aria-hidden=true]');
        if(value) {
          frames.push(value.textContent);
          window.uiCounterWidths.push(value.parentElement.getBoundingClientRect().width);
        }
        if(performance.now()-started<${duration}) requestAnimationFrame(sample); else resolve();
      };requestAnimationFrame(sample);
    });return frames;
  })()`);
}

function assertCounted(frames, final, initial = "۰") {
  assert.ok(
    frames.some((value) => value !== initial && value !== final),
    `expected intermediate counter values before ${final}; got ${JSON.stringify([...new Set(frames)])}`,
  );
  assert.equal(frames.at(-1), final);
}
try {
  const portFile = join(artifacts, "profile", "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await delay(100);
  const port = readFileSync(portFile, "utf8").split("\n")[0];
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) =>
    r.json(),
  );
  socket = new WebSocket(
    pages.find((page) => page.type === "page").webSocketDebuggerUrl,
  );
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const item = pending.get(message.id);
    if (item) {
      pending.delete(message.id);
      message.error
        ? item.reject(new Error(JSON.stringify(message.error)))
        : item.resolve(message.result);
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  // Native status uses the shared local cache, even while Bazaar is offline.
  await open("/dashboard?native=1");
  await until(
    "!!document.querySelector('[data-dashboard-subscription=active]')",
  );
  const badge = "document.querySelector('[data-dashboard-subscription]')";
  assert.equal(
    await evaluate(`${badge}.getAttribute('href')`),
    "/subscription",
  );
  assert.ok(await evaluate(`${badge}.getBoundingClientRect().height>=44`));
  await noOverflow();
  await screenshot("dashboard-subscription-active.png");
  await evaluate("window.uiSetFocused(false);window.uiSetFocused(true);true");
  await delay(150);
  await evaluate("document.querySelector('a[href=\"/about\"]').click();true");
  await until("location.pathname==='/about'");
  await evaluate(
    "document.querySelector('a[href=\"/dashboard\"]').click();true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=active]')",
  );
  assert.deepEqual(
    await evaluate(
      "(({queries,configurations,products})=>({queries,configurations,products}))(window.nativeFixture)",
    ),
    { queries: 0, configurations: 0, products: 0 },
    "dashboard focus and re-entry must not query Bazaar, configuration or prices",
  );
  // A deliberate visit to subscription still queries, and its result reaches home.
  await evaluate(
    "window.nativeFixture.source='trial';window.dispatchEvent(new Event('vocabflow:entitlement-changed'));true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=trial]')",
  );
  await evaluate(`window.nativeFixture.online=true;${badge}.click();true`);
  await until(
    "location.pathname==='/subscription'&&window.nativeFixture.queries===1&&window.uiQueryClient.isFetching()===0",
  );
  await evaluate(
    "document.querySelector('a[href=\"/dashboard\"]').click();true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=active]')",
  );
  assert.equal(await evaluate("window.nativeFixture.queries"), 1);
  for (const [source, expected] of [
    ["trial", "trial"],
    ["developer", "developer"],
    ["locked", "inactive"],
  ]) {
    await evaluate(
      `window.nativeFixture.source=${JSON.stringify(source)};window.dispatchEvent(new Event('vocabflow:entitlement-changed'));true`,
    );
    await until(
      `!!document.querySelector('[data-dashboard-subscription=${expected}]')`,
    );
    assert.equal(await evaluate("window.nativeFixture.queries"), 1);
    await noOverflow();
  }
  await evaluate(
    "window.nativeFixture.source='trial';window.nativeFixture.trialRemainingDays=0;window.nativeFixture.trialDayActive=true;window.dispatchEvent(new Event('vocabflow:entitlement-changed'));true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=trial]')",
  );
  assert.match(
    await evaluate(`${badge}.getAttribute('aria-label')`),
    /آخرین روز آزمایشی/,
  );
  await evaluate(
    "window.nativeFixture.source='bazaar';window.nativeFixture.deadline=Date.now()+700;window.dispatchEvent(new Event('vocabflow:entitlement-changed'));true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=active]')",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=verification]')",
  );
  assert.equal(
    await evaluate("window.nativeFixture.queries"),
    1,
    "deadline re-evaluation must stay local",
  );
  await screenshot("dashboard-subscription-verification.png");
  await evaluate(
    "window.nativeFixture.failSnapshot=true;window.dispatchEvent(new Event('vocabflow:entitlement-changed'));true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=unknown]')",
  );
  assert.doesNotMatch(await evaluate(`${badge}.textContent`), /غیرفعال/);
  await evaluate(
    "window.nativeFixture.failSnapshot=false;window.nativeFixture.holdSnapshot=true;void window.uiQueryClient.resetQueries({queryKey:['subscription','entitlement']});true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=loading]')",
  );
  await evaluate(
    "window.nativeFixture.holdSnapshot=false;window.nativeFixture.resolveSnapshot();true",
  );
  await until(
    "!!document.querySelector('[data-dashboard-subscription=verification]')",
  );
  assert.deepEqual(await evaluate("window.uiErrors"), []);
  for (const theme of ["dark", "study"]) {
    await open(`/dashboard?native=1&theme=${theme}`);
    await until(
      "!!document.querySelector('[data-dashboard-subscription=active]')",
    );
    await noOverflow();
    await screenshot(`dashboard-subscription-${theme}.png`);
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await noOverflow();
  assert.ok(await evaluate(`${badge}.getBoundingClientRect().height>=44`));
  await screenshot("dashboard-subscription-320.png");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });

  await open("/dashboard");
  assert.equal(
    await evaluate("!!document.querySelector('[data-dashboard-subscription]')"),
    false,
    "web has no native subscription badge",
  );
  await until(
    "document.querySelector('.dashboard-hero-workload [aria-hidden=true]')?.textContent==='۱۲'",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')",
    ),
    "14",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.dashboard-hero-workload [aria-hidden=true]').textContent",
    ),
    "۱۲",
  );
  await noOverflow();
  await screenshot("dashboard-mobile.png");
  await checkHeatmapLayout();
  const before = statsRequests;
  await evaluate(
    "window.uiEntrances=0;document.querySelector('.dashboard-hero-heading').addEventListener('animationstart',()=>window.uiEntrances++)",
  );
  reviewsToday = 3;
  await evaluate("window.uiQueryClient.invalidateQueries().then(()=>true)");
  await delay(400);
  assert.equal(
    statsRequests,
    before,
    "dashboard must not request the statistics aggregate",
  );
  assert.equal(
    await evaluate("window.uiEntrances"),
    0,
    "a refetch must not replay the entrance",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('[aria-label=\"آمار کلی\"] article:nth-child(3) .sr-only').textContent",
    ),
    "۳",
  );
  await evaluate(
    "document.querySelector('[aria-label=\"آمار کلی\"]').scrollIntoView({block:'center'})",
  );
  await until(
    "document.querySelector('[aria-label=\"آمار کلی\"] article:nth-child(3) .tabular-nums [aria-hidden=true]')?.textContent==='۳'",
  );

  await open("/statistics");
  assert.equal(
    await evaluate(
      "document.querySelectorAll('[aria-label=\"خلاصه آمار\"] article').length",
    ),
    3,
  );
  await noOverflow();
  await screenshot("statistics-mobile.png");
  const rect = await evaluate(
    `(()=>{const cell=document.querySelectorAll('.chart-review-day')[4];cell.scrollIntoView({block:'center'});const r=cell.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
  );
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: rect.x, y: rect.y }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await until(
    "document.querySelectorAll('.chart-review-day')[4].getAttribute('aria-pressed')==='true'",
  );
  const firstDetail = await evaluate(
    "document.querySelector('.chart-review-day').closest('figure').querySelector('[role=status]').textContent",
  );
  assert.match(firstDetail, /مرور/);
  await evaluate("document.querySelectorAll('.chart-review-day')[4].focus()");
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "ArrowRight",
    code: "ArrowRight",
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "ArrowRight",
    code: "ArrowRight",
  });
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.chart-review-day')[5]===document.activeElement",
    ),
    true,
  );
  assert.notEqual(
    await evaluate(
      "document.querySelector('.chart-review-day').closest('figure').querySelector('[role=status]').textContent",
    ),
    firstDetail,
  );
  await screenshot("statistics-chart-selected.png");
  await checkHeatmapLayout();
  await evaluate("document.querySelectorAll('.chart-heat-cell')[20].focus()");
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "ArrowRight",
    code: "ArrowRight",
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "ArrowRight",
    code: "ArrowRight",
  });
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.chart-heat-cell')[27]===document.activeElement",
    ),
    true,
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.chart-heat-cell[tabindex=\"0\"]').length",
    ),
    1,
  );
  await evaluate(
    "document.querySelector('.chart-heat-cell').closest('figure').querySelector('[aria-label=\"روز قبل\"]').click()",
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.chart-heat-cell')[26].getAttribute('aria-pressed')",
    ),
    "true",
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.chart-heat-cell[aria-pressed=\"true\"]')).outlineColor",
    ),
    "rgb(131, 82, 33)",
    "selected study day uses a dark bronze outline",
  );

  for (const theme of ["dark", "study"]) {
    await open(`/statistics?theme=${theme}`);
    assert.equal(
      await evaluate(`document.documentElement.classList.contains('${theme}')`),
      true,
    );
    await noOverflow();
    await checkHeatmapLayout();
    await screenshot(`statistics-${theme}.png`);
  }
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await open("/dashboard", "done");
  assert.equal(
    await evaluate(
      "document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')",
    ),
    "100",
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('[data-study-complete=true]')).animationName",
    ),
    "none",
  );
  reviewsToday = 8;
  await evaluate("window.uiQueryClient.invalidateQueries().then(()=>true)");
  await until(
    "document.querySelector('[aria-label=\"آمار کلی\"] article:nth-child(3) .tabular-nums [aria-hidden=true]')?.textContent==='۸'",
  );
  await open("/statistics");
  await evaluate(
    "document.querySelector('.chart-review-day').scrollIntoView({block:'center'})",
  );
  await until(
    "document.querySelector('.chart-review-fill').dataset.entered==='true'",
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.chart-review-fill')).animationName",
    ),
    "none",
  );
  await open("/dashboard", "done");
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.ui-enter')).animationName",
    ),
    "none",
  );
  await screenshot("dashboard-done.png");
  await open("/dashboard", "rest");
  assert.equal(
    await evaluate(
      "document.querySelector('.dashboard-today-hero [role=progressbar]')===null",
    ),
    true,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('[data-study-complete=true]')===null",
    ),
    true,
  );
  await open("/dashboard", "empty");
  assert.match(
    await evaluate("document.body.textContent"),
    /انتخاب اولین کتاب/,
  );
  await open("/statistics", "empty");
  assert.match(
    await evaluate("document.body.textContent"),
    /هنوز آماری ثبت نشده است/,
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.chart-review-day,.chart-heat-cell').length",
    ),
    0,
  );
  await open("/statistics", "error");
  assert.match(
    await evaluate("document.body.textContent"),
    /خطا در بارگذاری آمار/,
  );
  await open("/dashboard", "error");
  assert.match(await evaluate("document.body.textContent"), /تلاش دوباره/);
  await open("/dashboard", "loading");
  assert.match(
    await evaluate("document.body.textContent"),
    /شروع مطالعه|ادامه مطالعه/,
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 740,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await open("/statistics");
  await noOverflow();
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1365,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await open("/statistics");
  await noOverflow();
  await screenshot("statistics-desktop.png");
  await evaluate("window.uiRenderSummary(true)");
  await until("!!document.querySelector('[data-study-complete=false]')");
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].every(button=>button.disabled)",
    ),
    true,
  );
  await evaluate("window.uiRenderSummary(false)");
  await until("!!document.querySelector('[data-study-complete=true]')");
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].every(button=>!button.disabled)",
    ),
    true,
  );
  await screenshot("study-summary.png");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  const firstCounter = await sampleCounter("window.uiRenderCounter(120)");
  assertCounted(firstCounter, "۱۲۰");
  assert.equal(
    await evaluate(
      "Math.max(...window.uiCounterWidths)-Math.min(...window.uiCounterWidths)<1",
    ),
    true,
    "counting must reserve the final numeral width",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#counter-fixture .sr-only').textContent",
    ),
    "۱۲۰",
  );
  const productionCounter = await sampleCounter(
    "window.uiRenderCounter(240,{strict:false,key:'production'})",
  );
  assertCounted(productionCounter, "۲۴۰");
  const changedCounter = await sampleCounter(
    "window.uiRenderCounter(400,{strict:false,key:'production'})",
    500,
  );
  assertCounted(changedCounter, "۴۰۰", "۲۴۰");
  const unchangedCounter = await sampleCounter(
    "window.uiRenderCounter(400,{strict:false,key:'production'})",
    150,
  );
  assert.ok(
    unchangedCounter.every((value) => value === "۴۰۰"),
    "unchanged data must not restart counting",
  );
  const offscreenCounter = await sampleCounter(
    "window.uiRenderCounter(120,{below:true,key:'below'})",
    200,
  );
  assert.ok(
    offscreenCounter.every((value) => value === "۰"),
    "offscreen counters wait for their first view",
  );
  assertCounted(
    await sampleCounter(
      "document.querySelector('#counter-fixture > span').scrollIntoView({block:'center'})",
    ),
    "۱۲۰",
  );
  await evaluate("window.scrollTo(0,0)");
  await delay(100);
  const revisitedCounter = await sampleCounter(
    "document.querySelector('#counter-fixture > span').scrollIntoView({block:'center'})",
    150,
  );
  assert.ok(
    revisitedCounter.every((value) => value === "۱۲۰"),
    "scrolling back must not restart counting",
  );
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reducedCounter = await sampleCounter(
    "window.uiRenderCounter(80,{percent:true,key:'reduced'})",
    150,
  );
  assert.ok(
    reducedCounter.every((value) => value === "۸۰٪"),
    "reduced motion must show the final value immediately",
  );
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await sampleCounter(
    "window.uiRenderCounter(1200,{key:'motion-change'})",
    100,
  );
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await until(
    "document.querySelector('#counter-fixture [aria-hidden=true]').textContent==='۱٬۲۰۰'",
  );
  assert.equal(
    writes,
    0,
    "dashboard/statistics interactions must never write learning data",
  );
  console.log(
    `UI smoke passed (${production ? "production" : "development"} React): native subscription states, shared cache, local expiry, loading/error, 44px targets and focus/re-entry without Bazaar requests; counter first-view/update/offscreen/reduced-motion with/without StrictMode, touch/keyboard chart selection, date readouts, refetch stability, three themes, partial/done/rest/empty/loading/error, 320/360/1365px; no data writes.`,
  );
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close();
  child.kill();
  server.close();
}
