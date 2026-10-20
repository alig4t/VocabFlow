// Actual App/startup gate in Chromium, with controlled seed/native boundaries.
// Run with Vite on :5173: node --experimental-websocket tests/startup-ui-smoke.mjs
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const browser =
  process.env.VOCABFLOW_CHROME ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
assert.ok(browser, "Set VOCABFLOW_CHROME to an installed Chromium.");
const artifacts = mkdtempSync(join(tmpdir(), "vocabflow-startup-ui-"));
const viteUrl = process.env.VOCABFLOW_VITE_URL ?? "http://127.0.0.1:5173";
const production = process.env.VOCABFLOW_UI_PRODUCTION === "1";
const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {QueryClient,QueryClientProvider} from '@tanstack/react-query'; import App from './src/App';
      createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,
        React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(App))));`,
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
      name: "startup-ui-boundaries",
      setup(builder) {
        builder.onResolve({ filter: /(?:^|\/)seed$/ }, () => ({
          path: "seed",
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
        builder.onResolve(
          { filter: /(?:^|\/)services\/subscription\.service$/ },
          () => ({ path: "subscription", namespace: "fixture" }),
        );
        builder.onResolve(
          {
            filter:
              /(?:^|\/)components\/layout\/(Layout|NativeBackButton|StatusBarSync)$/,
          },
          ({ path }) => ({
            path: path.split("/").at(-1),
            namespace: "fixture",
          }),
        );
        builder.onResolve(
          { filter: /(?:^|\/)pages\/dashboard\/DashboardPage$/ },
          () => ({ path: "dashboard", namespace: "fixture" }),
        );
        builder.onResolve({ filter: /^@capacitor\/app$/ }, () => ({
          path: "app",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          contents: {
            seed: `export const seedIfNeeded=progress=>{
            window.fixture.attempts++; window.fixture.progress=progress;
            return new Promise((resolve,reject)=>{window.fixture.resolve=resolve;window.fixture.reject=reject;});
          };`,
            platform: "export const isNative=()=>true;",
            notifications:
              "export const initNotifications=()=>{window.fixture.notifications++;}; export const rescheduleNotifications=()=>{}; export const beginStudySession=()=>{}; export const endStudySession=()=>{}; export const ensureNotificationPermission=async()=>true;",
            safeArea: "export const syncSafeAreaVars=()=>{};",
            bazaarBilling:
              "export const BazaarBilling={addListener:async()=>({remove:async()=>{}})};",
            subscription:
              "export const subscriptionService={onResume:async()=>{window.fixture.billing++;}};",
            app: "export const App={addListener:async()=>({remove:async()=>{}})};",
            Layout: "export const Layout=({children})=>children;",
            NativeBackButton: "export const NativeBackButton=()=>null;",
            StatusBarSync: "export const StatusBarSync=()=>null;",
            dashboard: `import React from 'react'; export const DashboardPage=()=>{
            window.fixture.routeRenders++;
            return React.createElement('p',{id:'ready-route'},'داشبورد آماده است');
          };`,
          }[path],
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://fixture");
    if (url.pathname === "/app.js") {
      response.setHeader("Content-Type", "text/javascript");
      response.end(bundle.outputFiles[0].text);
    } else if (/^\/(fonts|logo)\//.test(url.pathname)) {
      const asset = await fetch(`${viteUrl}${request.url}`);
      response.writeHead(asset.status, {
        "Content-Type":
          asset.headers.get("content-type") ?? "application/octet-stream",
      });
      response.end(Buffer.from(await asset.arrayBuffer()));
    } else {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="fa" dir="ltr"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <link rel="stylesheet" href="${viteUrl}/src/index.css?direct">
        <style>:root{--safe-top:24px;--safe-bottom:24px}</style></head><body><div id="root"></div>
        <script>localStorage.setItem('onboardingCompleted','true');
          localStorage.setItem('eng-theme',${JSON.stringify(url.searchParams.get("theme") ?? "light")});
          window.fixture={attempts:0,routeRenders:0,notifications:0,billing:0}; window.uiErrors=[];
          window.addEventListener('error',e=>window.uiErrors.push(e.message));
          window.addEventListener('unhandledrejection',e=>window.uiErrors.push(String(e.reason)));
        </script><script type="module" src="/app.js"></script></body></html>`);
    }
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
let socket,
  sequence = 0;
const pending = new Map();
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
    awaitPromise: true,
    returnByValue: true,
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
try {
  const portFile = join(artifacts, "profile", "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await delay(100);
  const port = readFileSync(portFile, "utf8").split("\n")[0];
  const pages = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  socket = new WebSocket(
    pages.find((page) => page.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true }),
  );
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const task = pending.get(message.id);
    if (task) {
      pending.delete(message.id);
      if (message.error) task.reject(new Error(JSON.stringify(message.error)));
      else task.resolve(message.result);
    }
  });
  await send("Page.enable");
  for (const [theme, width] of [
    ["light", 360],
    ["dark", 360],
    ["study", 320],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 740,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await send("Page.navigate", { url: `${origin}/dashboard?theme=${theme}` });
    await until(
      "window.fixture?.attempts===1 && !!document.querySelector('[role=status]')",
    );
    await evaluate("window.fixture.progress(.4,'در حال آماده‌سازی واژه‌ها')");
    await until("document.body.textContent.includes('40٪')");
    assert.deepEqual(
      await evaluate(
        "[fixture.routeRenders,fixture.notifications,fixture.billing]",
      ),
      [0, 0, 0],
    );
    await evaluate(
      "window.fixture.reject(new Error('injected database failure'))",
    );
    await until("!!document.querySelector('[role=alert]')");
    assert.deepEqual(
      await evaluate(
        "[fixture.routeRenders,fixture.notifications,fixture.billing]",
      ),
      [0, 0, 0],
    );
    await evaluate("document.fonts.ready.then(()=>true)");
    const layout =
      await evaluate(`(()=>{const b=document.querySelector('button');const r=b.getBoundingClientRect();return {
      text:b.textContent, visible:r.top>=24&&r.bottom<=innerHeight-24, touch:r.height>=44,
      rtl:getComputedStyle(b).direction==='rtl', fits:document.documentElement.scrollWidth<=innerWidth};})()`);
    assert.deepEqual(layout, {
      text: "تلاش دوباره",
      visible: true,
      touch: true,
      rtl: true,
      fits: true,
    });
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(
      join(artifacts, `startup-error-${theme}.png`),
      Buffer.from(screenshot.data, "base64"),
    );
    await evaluate("document.querySelector('button').click()");
    await until(
      "window.fixture.attempts===2 && !document.querySelector('[role=alert]') && !!document.querySelector('[role=status]')",
    );
    assert.deepEqual(
      await evaluate(
        "[fixture.routeRenders,fixture.notifications,fixture.billing]",
      ),
      [0, 0, 0],
    );
    await evaluate("window.fixture.resolve()");
    await until("!!document.querySelector('#ready-route')");
    assert.equal(await evaluate("fixture.attempts"), 2);
    assert.ok(await evaluate("fixture.notifications>0 && fixture.billing>0"));
    assert.deepEqual(await evaluate("window.uiErrors"), []);
  }
  console.log(
    `Startup UI passed (${production ? "production" : "development"} React): one preparation, failure blocks routes/lifecycle, retry recovers without reload; light/dark/study at 320/360px.`,
  );
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close();
  child.kill();
  server.close();
  server.closeAllConnections();
}
