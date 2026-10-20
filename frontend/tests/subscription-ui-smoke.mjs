// Headless Chrome UI smoke checks. Billing/storage are fixtures, not live Bazaar.
// Run from frontend/: node tests/subscription-ui-smoke.mjs
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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
async function compileUi(discountsEnabled) {
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
          builder.onLoad(
            { filter: /[\\/]config[\\/]subscription\.ts$/ },
            ({ path }) => ({
              contents: readFileSync(path, "utf8").replace(
                /export const SUBSCRIPTION_DISCOUNTS_ENABLED = (?:true|false);/,
                `export const SUBSCRIPTION_DISCOUNTS_ENABLED = ${discountsEnabled};`,
              ),
              loader: "ts",
            }),
          );
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
          builder.onResolve({ filter: /^@capacitor\/app$/ }, () => ({
            path: "app",
            namespace: "fixture",
          }));
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => {
            const modules = {
              app: `export const App={
                addListener:async(event,listener)=>{
                  window.fixture.appListeners??={};
                  window.fixture.appListeners[event]=listener;
                  return {remove:()=>{delete window.fixture.appListeners[event];}};
                },
                exitApp:async()=>{document.body.dataset.appExited='true';}
              };`,
              platform: "export const isNative=()=>window.fixture.native;",
              bootstrap: "export const prepareNative=async()=>{};",
              notifications:
                "export const initNotifications=()=>{}; export const rescheduleNotifications=()=>{}; export const beginStudySession=()=>{}; export const endStudySession=()=>{}; export const ensureNotificationPermission=async()=>true;",
              safeArea: "export const syncSafeAreaVars=()=>{};",
              billing: `export const BazaarBilling={
          addListener:async()=>({remove:async()=>{}}),
          getEnvironment:async()=>({wallTime:Date.now(),elapsedRealtime:performance.now(),bootId:'ui',online:(!window.fixture.entryCheck||window.fixture.entryReady)&&(!!window.fixture.purchase||!!window.fixture.refresh)}),
          getSubscribedProducts:async()=>{
            document.body.dataset.subscriptionQueries=String(Number(document.body.dataset.subscriptionQueries??0)+1);
            if(window.fixture.refresh==='error')throw new Error('ارتباط با بازار برقرار نشد.');
            return {purchases:window.fixture.refresh==='active'||window.fixture.subscribed?[{productId:window.fixture.plan}]:[],clock:{wallTime:Date.now(),elapsedRealtime:performance.now(),bootId:'ui'}};
          },
          getConfiguration:async()=>({configured:true,products:[{plan:'monthly',sku:'month'},{plan:'quarterly',sku:'quarter'},{plan:'yearly',sku:'year'}]}),
          getProducts:async()=>({products:[{sku:'month',price:'۱۰۰٬۰۰۰ ریال'},{sku:'quarter',price:'۲۵۰٬۰۰۰ ریال'},{sku:'year',price:'۸۰۰٬۰۰۰ ریال'}]}),
          subscribe:async(options)=>{
            document.body.dataset.purchaseSku=options.sku;
            document.body.dataset.purchaseToken=options.dynamicPriceToken??'omitted';
            document.body.dataset.purchaseCount=String(Number(document.body.dataset.purchaseCount??0)+1);
            window.fixture.subscribed=true;
          },
          activateDeveloper:async()=>({version:1,activatedAt:Date.now(),validUntil:Date.now()+30*86400000,lastCodeDay:'20261011'})
        };`,
              entitlement: `export const getEntitlementSnapshot=async()=>({
          hasPremiumAccess:window.fixture.premium&&(!window.fixture.expires||Date.now()<window.fixture.deadline),
          source:window.fixture.expires&&Date.now()>=window.fixture.deadline?'locked':window.fixture.cached&&!window.fixture.clockSuspicious?'bazaar':window.fixture.premium?'trial':'locked',
          bazaarStatus:window.fixture.inactive?'inactive':window.fixture.cached&&Date.now()<window.fixture.deadline&&!window.fixture.clockSuspicious?'cached_active':window.fixture.cached?'needs_verification':'unknown',
          bazaarProductIds:window.fixture.cached&&Date.now()<window.fixture.deadline&&!window.fixture.clockSuspicious?[window.fixture.plan]:[],
          trialRemainingDays:window.fixture.premium&&!window.fixture.expires?6:0,trialDayActive:false,
          lastVerifiedActiveAt:Date.now()-86400000,offlineAccessUntil:window.fixture.deadline,
          developerUntil:null,clockSuspicious:window.fixture.clockSuspicious,evaluatedAt:Date.now()
        });
        export const saveVerifiedSubscriptions=async(purchases)=>{
          window.fixture.cached=purchases.length>0;
          window.fixture.inactive=purchases.length===0;
          if(!window.fixture.expires)window.fixture.deadline=Date.now()+7*86400000;
          window.dispatchEvent(new Event('vocabflow:entitlement-changed'));
        };
        export const saveDeveloperGrant=async()=>{window.fixture.premium=true;window.dispatchEvent(new Event('vocabflow:entitlement-changed'));};`,
            };
            return { contents: modules[path], loader: "js" };
          });
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}
const js = await compileUi(true);
const disabledJs = await compileUi(false);
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
  if (request.url === "/app.js" || request.url === "/app-disabled.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(request.url === "/app-disabled.js" ? disabledJs : js);
    return;
  }
  const url = new URL(request.url, "http://fixture");
  const expires = url.searchParams.get("expires") === "1";
  const fixture = {
    native: url.searchParams.get("web") !== "1",
    premium: url.searchParams.get("locked") !== "1",
    cached: expires || url.searchParams.get("cached") === "1",
    expires,
    purchase: url.searchParams.get("purchase"),
    plan: url.searchParams.get("plan") ?? "month",
    refresh: url.searchParams.get("refresh"),
    entryCheck: url.searchParams.has("entryCheck"),
    clockSuspicious: url.searchParams.get("clock") === "1",
    discountsEnabled: url.searchParams.get("discounts") !== "0",
  };
  const activate = url.searchParams.get("activate") === "1";
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="${viteUrl}/src/index.css?direct"></head><body><div id="root"></div>
    <script>window.fixture=${JSON.stringify(fixture)};
      window.fixture.deadline=Date.now()+(window.fixture.expires?2000:6*86400000);
      localStorage.setItem('authUser',JSON.stringify({id:'ui',name:'کاربر',role:'ADMIN'}));localStorage.setItem('accessToken','ui');localStorage.setItem('refreshToken','ui');
      window.addEventListener('error',e=>document.body.dataset.error=e.message);
      window.addEventListener('unhandledrejection',e=>document.body.dataset.error=String(e.reason));
    </script><script type="module" src="${fixture.discountsEnabled ? "/app.js" : "/app-disabled.js"}"></script>
    ${
      url.searchParams.has("sidebarBack")
        ? `<script>setTimeout(async()=>{
      const pause=()=>new Promise(resolve=>setTimeout(resolve,25));
      const waitFor=async(check,label)=>{
        for(let i=0;i<80;i++){if(check())return;await pause();}
        throw new Error('sidebar check timed out: '+label);
      };
      const sidebarOpen=()=>document.querySelector('aside')?.classList.contains('translate-x-0');
      const back=()=>window.fixture.appListeners.backButton();
      try{
        await waitFor(()=>window.fixture.appListeners?.backButton&&document.querySelector('aside'),'layout');
        document.querySelector('a[href="/subscription"]').click();
        await waitFor(()=>location.pathname==='/subscription'&&document.querySelector('h1')?.textContent==='اشتراک من','subscription');
        const href=location.href;
        const historyLength=history.length;
        const open=async()=>{
          document.querySelector('[aria-label="باز کردن منو"]').click();
          await waitFor(sidebarOpen,'open');
        };
        await open();
        back();
        await waitFor(()=>!sidebarOpen(),'dismiss sidebar');
        if(location.href!==href||history.length!==historyLength||document.body.dataset.appExited)
          throw new Error('sidebar back navigated or exited');
        // Dialogs still dismiss before a sidebar underneath them.
        await open();
        [...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='درج کد تخفیف').click();
        await waitFor(()=>document.querySelector('[role="dialog"][data-state="open"]'),'dialog');
        back();
        await waitFor(()=>!document.querySelector('[role="dialog"][data-state="open"]'),'dismiss dialog');
        if(!sidebarOpen())throw new Error('dialog back also dismissed sidebar');
        back();
        await waitFor(()=>!sidebarOpen(),'dismiss sidebar after dialog');
        if(location.href!==href)throw new Error('overlay dismissal changed route');
        back();
        await waitFor(()=>location.pathname==='/about','normal back after dismissal');
        document.body.dataset.sidebarBack='passed';
      }catch(error){document.body.dataset.actionError=error.message;}
    },750);</script>`
        : ""
    }
    ${
      fixture.entryCheck
        ? `<script>setTimeout(async()=>{
      const pause=()=>new Promise(resolve=>setTimeout(resolve,25));
      const waitFor=async(check,label)=>{
        for(let i=0;i<60;i++){if(check())return;await pause();}
        throw new Error('entry check timed out: '+label);
      };
      const button=text=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===text);
      const navigate=async(path)=>{
        const link=document.querySelector('a[href="'+path+'"]');
        if(!link)throw new Error('navigation link missing: '+path);
        link.click();
        const title=path==='/subscription'?'اشتراک من':'وکب فلو';
        await waitFor(()=>location.pathname===path&&document.querySelector('h1')?.textContent===title,path);
      };
      const queries=()=>Number(document.body.dataset.subscriptionQueries??0);
      const settled=()=>button('بررسی مجدد')&&!button('بررسی مجدد').disabled;
      try{
        // Startup was offline: only entering the subscription route can query Bazaar.
        if(queries()!==0)throw new Error('unexpected startup subscription query');
        window.fixture.entryReady=true;
        const deadline=window.fixture.deadline;
        await navigate('/subscription');
        await waitFor(()=>queries()===1&&settled(),'first entry query');
        window.dispatchEvent(new Event('vocabflow:entitlement-changed'));
        await pause();
        if(queries()!==1)throw new Error('render repeated subscription query');
        await navigate('/about');
        await navigate('/subscription');
        await waitFor(()=>queries()===2&&settled(),'second entry query');
        if(window.fixture.refresh==='error'&&window.fixture.deadline!==deadline)
          throw new Error('failed entry refresh changed cached deadline');
        button('بررسی مجدد').click();
        await waitFor(()=>queries()===3&&settled(),'manual refresh after entry');
        if(document.body.dataset.purchaseCount)throw new Error('entry started a purchase');
        document.body.dataset.entryCheck='passed';
      }catch(error){document.body.dataset.actionError=error.message;}
    },750);</script>`
        : ""
    }
    ${
      fixture.purchase ||
      url.searchParams.has("previewDiscount") ||
      url.searchParams.has("discountAction")
        ? `<script>setTimeout(async()=>{
      const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
      const button=text=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===text);
      const click=async(text)=>{const target=button(text);if(!target||target.disabled)throw new Error('button unavailable: '+text);target.click();await pause();};
      const input=()=>document.querySelector('[role="dialog"][data-state="open"] #subscription-discount-token');
      const type=async(token)=>{
        if(!input())throw new Error('discount modal input missing');
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input(),token);
        input().dispatchEvent(new Event('input',{bubbles:true}));
        await pause();
      };
      try{
        const params=new URLSearchParams(location.search);
        const action=params.get('discountAction');
        const preview=params.has('previewDiscount');
        const longToken='header.'+'example'.repeat(45)+'.signature';
        if(window.fixture.discountsEnabled&&(window.fixture.purchase!=='ordinary')){
          await click('درج کد تخفیف');
          const token=window.fixture.purchase==='invalid'?'invalid-code':preview||action==='long'?longToken:'  header.payload.signature  ';
          await type(token);
          if(preview){
            document.body.dataset.modalOverflow=String(document.querySelector('[role="dialog"]').scrollWidth>document.querySelector('[role="dialog"]').clientWidth);
            return;
          }
          await click('ثبت کد تخفیف');
          if(window.fixture.purchase==='invalid')return;
          document.body.dataset.entrySaved=String(!input()&&!!button('ویرایش کد'));
          if(action==='long'){
            document.body.dataset.longCodeSaved=String(document.querySelector('bdi[title]')?.textContent===longToken);
            button('ویرایش کد').scrollIntoView({block:'center'});
          }
          if(action==='nativeBack'){
            await click('ویرایش کد');
            await type('unsaved.payload.signature');
            if(!window.fixture.appListeners?.backButton)throw new Error('native back handler missing');
            window.fixture.appListeners.backButton();
            await pause();
            document.body.dataset.pathAfterBack=location.pathname;
            document.body.dataset.modalClosedAfterBack=String(!input());
            document.body.dataset.savedCodeAfterBack=document.querySelector('bdi[title]')?.textContent??'empty';
            await click('ویرایش کد');
            document.body.dataset.draftAfterBack=input()?.value??'missing';
          }
          if(action==='edit'||action==='cancel'||action==='remove'){
            await click('ویرایش کد');
            document.body.dataset.editPrefilled=String(input()?.value==='header.payload.signature');
            if(action==='remove')await click('حذف کد');
            else{
              await type('edited.payload.signature');
              await click(action==='cancel'?'انصراف':'ثبت کد تخفیف');
            }
            document.body.dataset.finalCode=document.querySelector('bdi[title]')?.textContent??'empty';
          }
          if(action==='cancelNew'){
            await click('ویرایش کد');
            await click('حذف کد');
            await click('درج کد تخفیف');
            await type('unsaved.payload.signature');
            await click('انصراف');
            await click('درج کد تخفیف');
            document.body.dataset.unsavedDiscarded=String(input()?.value==='');
          }
        }else if(input()||(!window.fixture.discountsEnabled&&button('درج کد تخفیف'))){
          throw new Error('unexpected discount input');
        }
        document.body.dataset.horizontalOverflow=String(document.documentElement.scrollWidth>document.documentElement.clientWidth);
        if(window.fixture.purchase){
          await click('خرید اشتراک');
          document.body.dataset.discountCleared=String(!!button('درج کد تخفیف')||!window.fixture.discountsEnabled);
        }
      }catch(error){document.body.dataset.actionError=error.message;}
    },1500);</script>`
        : ""
    }
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
  const sidebarBack = await page("/about?sidebarBack=1");
  assert.match(sidebarBack, /data-sidebar-back="passed"/);
  assert.doesNotMatch(sidebarBack, /data-app-exited=/);
  for (const result of ["active", "error"]) {
    const entered = await page(
      `/about?entryCheck=1&refresh=${result}${result === "error" ? "&cached=1" : ""}`,
    );
    assert.match(entered, /data-entry-check="passed"/);
    assert.match(entered, /data-subscription-queries="3"/);
    assert.match(entered, /اشتراک یک‌ماهه فعال است/);
  }
  const subscription = await page("/subscription?cached=1", "subscription.png");
  assert.match(subscription, /اشتراک یک‌ماهه فعال است/);
  assert.match(subscription, /تأییدشده در بازار/);
  assert.match(subscription, /data-subscription-status="cached_active"/);
  assert.match(subscription, /جزئیات تأیید و استفاده آفلاین/);
  assert.match(subscription, /۱۰۰٬۰۰۰ ریال/);
  assert.match(subscription, /بازیابی خرید/);
  assert.match(subscription, /کد تخفیف وکب فلو وارد نشده \(اختیاری\)/);
  assert.match(subscription, /درج کد تخفیف/);
  assert.doesNotMatch(subscription, /id="subscription-discount-token"/);
  for (const [sku, title] of [
    ["quarter", "سه‌ماهه"],
    ["year", "یک‌ساله"],
  ]) {
    const plan = await page(`/subscription?cached=1&plan=${sku}`);
    assert.match(plan, new RegExp(`اشتراک ${title} فعال است`));
  }
  const unknownPlan = await page("/subscription?cached=1&plan=unknown");
  assert.match(unknownPlan, /اشتراک شما فعال است/);
  assert.doesNotMatch(unknownPlan, /اشتراک یک‌ماهه فعال است/);
  const confirmed = await page(
    "/subscription?refresh=active",
    "subscription-confirmed.png",
  );
  assert.match(confirmed, /اشتراک یک‌ماهه فعال است/);
  assert.match(confirmed, /role="status" class="[^"]*text-success/);
  assert.match(confirmed, /اشتراک از بازار تأیید شد/);
  const failed = await page(
    "/subscription?cached=1&refresh=error",
    "subscription-refresh-error.png",
  );
  assert.match(failed, /اشتراک یک‌ماهه فعال است/);
  assert.match(failed, /role="alert" class="[^"]*text-destructive/);
  assert.match(failed, /ارتباط با بازار برقرار نشد/);
  const revoked = await page("/subscription?cached=1&refresh=inactive");
  assert.match(revoked, /data-subscription-status="inactive"/);
  assert.match(revoked, /اشتراک فعالی پیدا نشد/);
  assert.doesNotMatch(revoked, /اشتراک یک‌ماهه فعال است/);
  const stale = await page(
    "/subscription?cached=1&expires=1",
    "subscription-verification.png",
  );
  assert.match(stale, /data-subscription-status="needs_verification"/);
  assert.doesNotMatch(stale, /اشتراک یک‌ماهه فعال است/);
  const staleSuccess = await page("/subscription?refresh=active&expires=1");
  assert.match(staleSuccess, /data-subscription-status="needs_verification"/);
  assert.doesNotMatch(staleSuccess, /اشتراک از بازار تأیید شد/);
  const clockChanged = await page("/subscription?cached=1&clock=1");
  assert.match(clockChanged, /زمان دستگاه تغییر کرده است/);
  assert.doesNotMatch(clockChanged, /اشتراک یک‌ماهه فعال است/);
  const discountPreview = await page(
    "/subscription?previewDiscount=1",
    "discount-input.png",
  );
  assert.match(discountPreview, /role="dialog"/);
  assert.match(discountPreview, /id="subscription-discount-token"/);
  assert.match(discountPreview, /data-modal-overflow="false"/);
  const saved = await page(
    "/subscription?discountAction=long",
    "discount-saved.png",
  );
  assert.match(saved, /data-entry-saved="true"/);
  assert.match(saved, /data-long-code-saved="true"/);
  assert.match(saved, /data-horizontal-overflow="false"/);
  const edited = await page("/subscription?discountAction=edit");
  assert.match(edited, /data-edit-prefilled="true"/);
  assert.match(edited, /data-final-code="edited.payload.signature"/);
  const cancelled = await page("/subscription?discountAction=cancel");
  assert.match(cancelled, /data-final-code="header.payload.signature"/);
  const nativeBack = await page("/subscription?discountAction=nativeBack");
  assert.match(nativeBack, /data-path-after-back="\/subscription"/);
  assert.match(nativeBack, /data-modal-closed-after-back="true"/);
  assert.match(
    nativeBack,
    /data-saved-code-after-back="header.payload.signature"/,
  );
  assert.match(nativeBack, /data-draft-after-back="header.payload.signature"/);
  assert.doesNotMatch(nativeBack, /data-app-exited=/);
  const removed = await page("/subscription?discountAction=remove");
  assert.match(removed, /data-final-code="empty"/);
  assert.match(removed, /کد تخفیف وکب فلو وارد نشده \(اختیاری\)/);
  const unsaved = await page("/subscription?discountAction=cancelNew");
  assert.match(unsaved, /data-unsaved-discarded="true"/);
  const discounted = await page(
    "/subscription?purchase=discount",
    "discount-purchase.png",
  );
  assert.match(discounted, /data-purchase-sku="month"/);
  assert.match(discounted, /data-purchase-token="header.payload.signature"/);
  assert.match(discounted, /data-purchase-count="1"/);
  assert.match(discounted, /data-discount-cleared="true"/);
  const ordinary = await page("/subscription?purchase=ordinary");
  assert.match(ordinary, /data-purchase-token="omitted"/);
  const disabled = await page("/subscription?purchase=discount&discounts=0");
  assert.doesNotMatch(disabled, /id="subscription-discount-token"/);
  assert.match(disabled, /data-purchase-token="omitted"/);
  const invalid = await page(
    "/subscription?purchase=invalid",
    "discount-error.png",
  );
  assert.match(invalid, /فرمت کد تخفیف درست نیست/);
  assert.match(invalid, /role="dialog"/);
  assert.match(invalid, /aria-invalid="true"/);
  assert.doesNotMatch(invalid, /data-purchase-sku=/);
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
    "UI smoke: sidebar dismissal before navigation, dialog priority over sidebar, automatic entry/re-entry refresh without render loops or unintended purchases, manual refresh, verified subscription plans, success/error notices, cache expiry/revocation/clock change, prices, discount modal, long codes, editing/cancelling/removing codes, discounted and ordinary purchase, disabled discounts, invalid input, locked study, in-session deadline, seven-tap developer activation, web about passed.",
  );
  console.log(`Screenshots: ${artifactDir}`);
} finally {
  server.close();
}
