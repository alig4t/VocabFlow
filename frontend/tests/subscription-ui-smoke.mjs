// Headless Chrome UI smoke checks. Billing/storage are fixtures, not live Bazaar.
// Run from frontend/: node tests/subscription-ui-smoke.mjs
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const browser =
  process.env.VOCABFLOW_CHROME ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
if (!browser)
  throw new Error("Set VOCABFLOW_CHROME to an installed Chromium executable.");
const artifactDir = mkdtempSync(join(tmpdir(), "vocabflow-subscription-ui-"));
const viteUrl = process.env.VOCABFLOW_VITE_URL ?? "http://127.0.0.1:5173";
const result = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import {QueryClient,QueryClientProvider} from '@tanstack/react-query'; import App from './src/App';
    createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,
      {client:new QueryClient({defaultOptions:{queries:{retry:false}}})},React.createElement(App)));`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  minify: true,
  define: { "import.meta.env": "{}" },
  plugins: [
    {
      name: "native-ui-fixtures",
      setup(builder) {
        builder.onResolve({ filter: /(?:^|\/)lib\/platform$/ }, () => ({
          path: "platform",
          namespace: "fixture",
        }));
        builder.onResolve({ filter: /(?:^|\/)offline\/bootstrap$/ }, () => ({
          path: "bootstrap",
          namespace: "fixture",
        }));
        builder.onResolve(
          { filter: /(?:^|\/)lib\/(notifications|safeArea)$/ },
          (args) => ({
            path: args.path.split("/").at(-1),
            namespace: "fixture",
          }),
        );
        builder.onResolve(
          { filter: /(?:^|\/)offline\/entitlement\.repo$/ },
          () => ({ path: "entitlement", namespace: "fixture" }),
        );
        builder.onResolve({ filter: /(?:^|\/)lib\/bazaarBilling$/ }, () => ({
          path: "billing",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => {
          const modules = {
            platform: "export const isNative=()=>window.fixture.native;",
            bootstrap: "export const prepareNative=async()=>{};",
            notifications:
              "export const initNotifications=()=>{}; export const rescheduleNotifications=()=>{}; export const beginStudySession=()=>{}; export const endStudySession=()=>{}; export const ensureNotificationPermission=async()=>true;",
            safeArea: "export const syncSafeAreaVars=()=>{};",
            billing: `export const BazaarBilling={
          addListener:async()=>({remove:async()=>{}}),
          getEnvironment:async()=>({wallTime:Date.now(),elapsedRealtime:performance.now(),bootId:'ui',online:false}),
          getConfiguration:async()=>({configured:true,products:[{plan:'monthly',sku:'month'},{plan:'quarterly',sku:'quarter'},{plan:'yearly',sku:'year'}]}),
          getProducts:async()=>({products:[{sku:'month',price:'۱۰۰٬۰۰۰ ریال'},{sku:'quarter',price:'۲۵۰٬۰۰۰ ریال'},{sku:'year',price:'۸۰۰٬۰۰۰ ریال'}]}),
          activateDeveloper:async()=>({version:1,activatedAt:Date.now(),validUntil:Date.now()+30*86400000,lastCodeDay:'20261011'})
        };`,
            entitlement: `export const getEntitlementSnapshot=async()=>({
          hasPremiumAccess:window.fixture.premium&&(!window.fixture.expires||Date.now()<window.fixture.deadline),
          source:window.fixture.expires&&Date.now()>=window.fixture.deadline?'locked':window.fixture.cached?'bazaar':window.fixture.premium?'trial':'locked',
          bazaarStatus:window.fixture.cached&&Date.now()<window.fixture.deadline?'cached_active':'needs_verification',
          trialRemainingDays:window.fixture.premium&&!window.fixture.expires?6:0,trialDayActive:false,
          lastVerifiedActiveAt:Date.now()-86400000,offlineAccessUntil:window.fixture.deadline,
          developerUntil:null,clockSuspicious:false,evaluatedAt:Date.now()
        });
        export const saveDeveloperGrant=async()=>{window.fixture.premium=true;window.dispatchEvent(new Event('vocabflow:entitlement-changed'));};`,
          };
          return { contents: modules[path], loader: "js" };
        });
      },
    },
  ],
});
const js = result.outputFiles[0].text;
const server = createServer(async (request, response) => {
  if (/^\/(logo|fonts)\//.test(request.url)) {
    const asset = await fetch(`${viteUrl}${request.url}`);
    response.statusCode = asset.status;
    response.setHeader(
      "Content-Type",
      asset.headers.get("content-type") ?? "application/octet-stream",
    );
    response.end(Buffer.from(await asset.arrayBuffer()));
    return;
  }
  if (request.url === "/app.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(js);
    return;
  }
  const url = new URL(request.url, "http://fixture");
  const expires = url.searchParams.get("expires") === "1";
  const fixture = {
    native: url.searchParams.get("web") !== "1",
    premium: url.searchParams.get("locked") !== "1",
    cached: expires || url.searchParams.get("cached") === "1",
    expires,
  };
  const activate = url.searchParams.get("activate") === "1";
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="${viteUrl}/src/index.css?direct"></head><body><div id="root"></div>
    <script>window.fixture=${JSON.stringify(fixture)};
      window.fixture.deadline=Date.now()+(window.fixture.expires?2000:6*86400000);
      localStorage.setItem('authUser',JSON.stringify({id:'ui',name:'کاربر',role:'ADMIN'}));localStorage.setItem('accessToken','ui');localStorage.setItem('refreshToken','ui');
      window.addEventListener('error',e=>document.body.dataset.error=e.message);
    </script><script type="module" src="/app.js"></script>
    ${
      activate
        ? `<script>setTimeout(()=>{
      const title=[...document.querySelectorAll('h1')].find(e=>e.textContent==='وکب فلو');
      if(!title){document.body.dataset.actionError='title missing';return;}
      for(let i=0;i<7;i++)title.click();
      setTimeout(()=>{const input=document.querySelector('#developer-access-code');
        if(!input){document.body.dataset.actionError='sheet missing';return;}
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'VF-TESTCODE');
        input.dispatchEvent(new Event('input',{bubbles:true}));
        setTimeout(()=>input.closest('form').requestSubmit(),200);
      },200);
    },1500);</script>`
        : ""
    }</body></html>`);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
async function page(path, screenshot) {
  const profile = mkdtempSync(join(artifactDir, "profile-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    // Desktop Chromium clamps its viewport to 500px even with a narrower
    // window; use that width so screenshots do not crop the fixture UI.
    "--window-size=500,915",
    `--user-data-dir=${profile}`,
    "--virtual-time-budget=4500",
    "--dump-dom",
  ];
  if (screenshot) args.push(`--screenshot=${join(artifactDir, screenshot)}`);
  args.push(`http://127.0.0.1:${port}${path}`);
  const html = await new Promise((resolve, reject) => {
    const child = spawn(browser, args, { windowsHide: true });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Chromium UI timeout"));
    }, 40_000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(new Error(errorOutput.slice(-1500)));
    });
  });
  assert.doesNotMatch(html, /data-error=|data-action-error=/);
  return html;
}
try {
  const subscription = await page("/subscription?cached=1", "subscription.png");
  assert.match(subscription, /مهلت استفاده بدون تأیید مجدد/);
  assert.match(subscription, /۱۰۰٬۰۰۰ ریال/);
  assert.match(subscription, /بازیابی خرید/);
  const locked = await page("/study?locked=1", "locked.png");
  assert.match(locked, /ادامه یادگیری با دسترسی Premium/);
  const timedOut = await page("/study?expires=1");
  assert.match(timedOut, /ادامه یادگیری با دسترسی Premium/);
  const about = await page("/about?activate=1", "developer.png");
  assert.match(about, /Developer Access/);
  assert.match(about, /دسترسی توسعه‌دهنده برای ۳۰ روز فعال شد/);
  const webAbout = await page("/about?web=1");
  assert.match(webAbout, /درباره‌ی سازنده/);
  assert.doesNotMatch(webAbout, /developer-access-code|Developer Access/);
  console.log(
    "UI smoke: subscription prices/status, locked study, in-session deadline, seven-tap developer activation, web about passed.",
  );
  console.log(`Screenshots: ${artifactDir}`);
} finally {
  server.close();
}
