// Production loader + layout geometry. No APK build or database reset.
// node --experimental-websocket tests/compat-ui-smoke.mjs
// VOCABFLOW_COMPAT_NATIVE=1 uses an already installed debug app via adb/CDP.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, extname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { generateCompatCss } from "../scripts/compat-css.mjs";

const native = process.env.VOCABFLOW_COMPAT_NATIVE === "1";
const adbPath =
  process.env.VOCABFLOW_ADB ??
  "C:/Users/User/AppData/Local/Android/Sdk/platform-tools/adb.exe";
const adb = (...args) =>
  execFileSync(adbPath, args, { encoding: "utf8", windowsHide: true }).trim();
const artifacts = mkdtempSync(join(tmpdir(), "vocabflow-compat-ui-"));
const requests = [];
let fixtureDirection = "EN_TO_FA";
let fixtureWrites = 0;
const fixtureWord = {
  id: "compat-card",
  eng: "remember",
  per: "به یاد آوردن",
  pronunciation: "/rɪˈmembə/",
  synonyms: [],
  antonyms: [],
  phrases: [],
  examples: [
    {
      id: "example",
      engSentence: "I remember this word.",
      perTranslation: "این واژه را به یاد دارم.",
    },
  ],
};
const fixtureCss = `.vf-test{font:16px sans-serif;width:240px;padding:0;border:0;direction:ltr}.vf-test .item{width:32px;height:20px;flex:none;margin:0}.vf-test.row{display:flex;gap:8px 12px}.vf-test.column{display:flex;flex-direction:column;gap:8px}.vf-test.wrap{display:flex;flex-wrap:wrap;gap:8px 12px;width:85px}.vf-test.grid{display:grid;grid-template-columns:32px 32px;gap:8px 12px}.vf-test.rtl{direction:rtl}.vf-test.reverse{flex-direction:row-reverse}.vf-test.auto .item:last-child{margin-left:auto}.vf-test.aspect{width:80px;aspect-ratio:2 / 3}.vf-test.math{width:min(140px, 100%);height:clamp(20px, 5vh, 60px)}.vf-test.logical{position:relative;height:40px}.vf-test.logical .item{position:absolute;inset-inline-start:12px}.vf-test.colored{color:hsl(var(--vf-test-color));--vf-test-color:42 80% 50%}`;
const compatFixture = await generateCompatCss(fixtureCss);
const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://fixture").pathname;
  requests.push(pathname);
  response.setHeader("Access-Control-Allow-Origin", "*");
  if (pathname.startsWith("/api/")) {
    if (request.method !== "GET") fixtureWrites++;
    const fixtures = {
      "/api/settings": {
        studyDirection: fixtureDirection,
        autoPlayAudio: false,
        showPhonetics: true,
        showExamples: true,
        cardOrder: "SEQUENTIAL",
      },
      "/api/plans": [
        {
          id: "fixture-plan",
          volumeId: "volume",
          bookId: "book",
          bookTitle: "Book",
          volumeTitle: "Volume 1",
          isActive: true,
        },
      ],
      "/api/study/today": {
        due: [fixtureWord],
        new: [],
        meta: {
          dueCount: 1,
          newCount: 0,
          dailyGoal: 10,
          reviewedToday: 0,
          introducedToday: 0,
          hardTodayCount: 0,
          hasPlans: true,
          direction: fixtureDirection,
          plans: [],
        },
      },
    };
    response.setHeader("Content-Type", "application/json");
    response.statusCode = pathname in fixtures ? 200 : 404;
    response.end(JSON.stringify({ success: true, data: fixtures[pathname] }));
    return;
  }
  const file = resolve("dist", "." + pathname);
  const selected =
    existsSync(file) && extname(file) ? file : resolve("dist/index.html");
  response.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".woff2": "font/woff2",
    }[extname(selected)] ?? "text/html; charset=utf-8",
  );
  if (!native && pathname === "/study") {
    fixtureDirection = new URL(request.url, "http://fixture").searchParams.get(
      "direction",
    );
    response.end(
      readFileSync(selected, "utf8").replace(
        "<head>",
        `<head><script>
      localStorage.setItem('authUser',JSON.stringify({id:'fixture',name:'کاربر',role:'USER'}));
      localStorage.setItem('accessToken','fixture');localStorage.setItem('refreshToken','fixture');
      localStorage.setItem('eng-theme','light');localStorage.removeItem('vocab_study_session_v2');
      sessionStorage.removeItem('vocab_study_session_v2');
    </script>`,
      ),
    );
  } else response.end(readFileSync(selected));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let socket;
let forward;
let sequence = 0;
const pending = new Map();
const errors = [];
let interceptedHtml;
let originalTheme;
let bridgeBootstrap;
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("CDP timeout: " + method));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 900; i++) {
    if (await evaluate("Boolean(" + expression + ")")) return;
    await delay(100);
  }
  throw new Error(
    "Timed out: " +
      expression +
      "; " +
      JSON.stringify({
        errors,
        requests,
        page: await evaluate(
          "({url:location.href,title:document.title,ready:document.readyState,text:document.body&&document.body.textContent.slice(0,120),scripts:document.scripts.length})",
        ),
      }),
  );
}
async function screenshot(name) {
  await delay(native ? 1800 : 600);
  if (native) {
    adb("shell", "screencap", "-p", "/data/local/tmp/vocabflow-compat.png");
    adb("pull", "/data/local/tmp/vocabflow-compat.png", join(artifacts, name));
  } else {
    const result = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(artifacts, name), Buffer.from(result.data, "base64"));
  }
}
try {
  let targets;
  if (native) {
    adb(
      "reverse",
      `tcp:${server.address().port}`,
      `tcp:${server.address().port}`,
    );
    adb("shell", "am", "force-stop", "ir.vocabflow.app");
    adb("shell", "am", "start", "-n", "ir.vocabflow.app/.MainActivity");
    await delay(2000);
    const pid = adb("shell", "pidof", "ir.vocabflow.app");
    forward = adb(
      "forward",
      "tcp:0",
      "localabstract:webview_devtools_remote_" + pid,
    );
    targets = await (
      await fetch(`http://127.0.0.1:${forward}/json/list`)
    ).json();
  } else {
    const chrome =
      process.env.VOCABFLOW_CHROME ??
      [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      ].find(existsSync);
    browser = spawn(
      chrome,
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
    for (
      let i = 0;
      i < 100 && !existsSync(join(artifacts, "profile", "DevToolsActivePort"));
      i++
    )
      await delay(100);
    const port = readFileSync(
      join(artifacts, "profile", "DevToolsActivePort"),
      "utf8",
    ).split("\n")[0];
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  }
  socket = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true }),
  );
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Network.requestIntercepted") {
      const path = new URL(message.params.request.url).pathname;
      requests.push(path);
      const asset = path.startsWith("/assets/");
      const body = asset
        ? readFileSync(resolve("dist", "." + path))
        : Buffer.from(interceptedHtml);
      const type = asset
        ? ({
            ".js": "text/javascript",
            ".css": "text/css",
            ".png": "image/png",
            ".svg": "image/svg+xml",
          }[extname(path)] ?? "application/octet-stream")
        : "text/html; charset=utf-8";
      const raw = Buffer.concat([
        Buffer.from(
          "HTTP/1.1 200 OK\r\nContent-Type: " +
            type +
            "\r\nContent-Length: " +
            body.length +
            "\r\n\r\n",
        ),
        body,
      ]);
      void send("Network.continueInterceptedRequest", {
        interceptionId: message.params.interceptionId,
        rawResponse: raw.toString("base64"),
      });
    }
    if (message.method === "Runtime.exceptionThrown") {
      const detail = message.params.exceptionDetails;
      errors.push({
        message: detail.exception?.description ?? detail.text,
        url: detail.url,
        line: detail.lineNumber,
      });
    }
    const promise = pending.get(message.id);
    if (!promise) return;
    clearTimeout(promise.timer);
    pending.delete(message.id);
    if (message.error) promise.reject(new Error(message.error.message));
    else promise.resolve(message.result);
  });
  await send("Runtime.enable");
  await send("Page.enable");
  if (native) {
    originalTheme = await evaluate("localStorage.getItem('eng-theme')");
    await until(
      "Array.from(document.scripts).some(function(s){return !s.src && s.textContent.indexOf('var nativeBridge')>=0})",
    );
    const bridge = await evaluate(
      "Array.from(document.scripts).filter(function(s){return !s.src && s.textContent.indexOf('var nativeBridge')>=0}).map(function(s){return s.textContent}).join('\\n')",
    );
    assert.ok(
      bridge.includes("PluginHeaders"),
      "Native bridge bootstrap is missing",
    );
    // The replacement document creates a new JS SQLiteConnection map. Close
    // the installed app's native connection first, without deleting its data.
    await until(
      "document.querySelector('#root') && document.querySelector('#root').textContent.length > 40 && !document.querySelector('#app-scroll .animate-shimmer')",
    );
    await delay(1500);
    await evaluate(
      "window.Capacitor.nativePromise('CapacitorSQLite','closeConnection',{database:'vocabflow',readonly:false})",
    );
    // Install before any callbacks from the previous document can arrive.
    bridgeBootstrap = await send("Page.addScriptToEvaluateOnNewDocument", {
      source: bridge,
    });
    let html = readFileSync("dist/index.html", "utf8");
    html = html.replace(
      "<head>",
      () =>
        '<head><script>localStorage.setItem("eng-theme","light");history.replaceState(null,\"\",\"/dashboard\");</script>',
    );
    interceptedHtml = html;
    await send("Network.enable");
    await send("Network.setRequestInterception", {
      patterns: [
        { urlPattern: "https://localhost/assets/*" },
        {
          urlPattern: "https://localhost/?vf-compat-test=*",
          resourceType: "Document",
        },
      ],
    });
    errors.length = 0;
    await send("Page.navigate", {
      url: "https://localhost/?vf-compat-test=" + Date.now(),
    });
  } else {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 360,
      height: 760,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await send("Page.navigate", { url: origin + "/login" });
  }
  await until(
    "document.querySelector('#root') && document.querySelector('#root').textContent.length > 40 && document.querySelector('button')",
  );
  await delay(1500);
  if (native)
    await until("!document.querySelector('#app-scroll .animate-shimmer')");
  const renderer = await evaluate(
    "document.documentElement.getAttribute('data-vocabflow-renderer')",
  );
  assert.equal(renderer, native ? "compat" : "modern");
  console.log(
    JSON.stringify({
      renderer,
      userAgent: await evaluate("navigator.userAgent"),
      errors,
      assetsRequested: requests.filter((path) => /\.(js|css)$/.test(path))
        .length,
    }),
  );
  assert.deepEqual(errors, []);
  const originalManifest = JSON.parse(
    readFileSync("dist/index.html", "utf8").match(
      /id="vocabflow-builds" type="application\/json">(.*?)<\/script>/,
    )[1],
  );
  assert.ok(
    !readFileSync("dist" + originalManifest.compat.entry, "utf8").includes(
      "--tw-border-spacing-x:0;",
    ),
    "Legacy JS must not inject the unconverted Tailwind stylesheet",
  );
  if (!native)
    assert.ok(
      !requests.some((path) => path.includes("/compat-")),
      "modern browser fetched compatibility assets",
    );
  else
    assert.ok(
      !requests.includes(originalManifest.modern.entry),
      "old engine fetched modern entry",
    );
  if (native)
    assert.ok(
      await evaluate(
        "parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'))>=0",
      ),
      "Native safe-area variable resolved",
    );
  await screenshot("app-light.png");
  if (native) {
    await evaluate(
      "document.querySelector('header button[aria-label*=\"تغییر به\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}))",
    );
    await until("document.documentElement.classList.contains('dark')");
    await until(
      "parseInt(getComputedStyle(document.body).backgroundColor.match(/\\d+/)[0],10)<50",
    );
    await screenshot("app-dark.png");
    await evaluate(
      "document.querySelector('header button[aria-label*=\"تغییر به\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}))",
    );
    await until("document.documentElement.classList.contains('study')");
    await screenshot("app-study.png");
    await evaluate(
      "document.querySelector('header button[aria-label*=\"تغییر به\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}))",
    );
    await until("document.documentElement.classList.contains('light')");
    await evaluate(
      "history.pushState(null,'','/library');dispatchEvent(new PopStateEvent('popstate'));",
    );
    await until(
      "location.pathname === '/library' && !document.querySelector('#app-scroll .animate-shimmer') && document.querySelectorAll('img').length > 5",
    );
    await screenshot("library.png");
    assert.ok(
      await evaluate(
        "document.querySelector('#app-scroll').scrollWidth <= document.querySelector('#app-scroll').clientWidth+1",
      ),
      "No horizontal overflow in library",
    );
    await evaluate(
      "history.pushState(null,'','/study');dispatchEvent(new PopStateEvent('popstate'));",
    );
    await until("document.querySelector('[data-review-card]')");
    for (const flipped of [false, true, false]) {
      if (
        (await evaluate(
          "document.querySelector('[data-review-card]').getAttribute('data-flipped')",
        )) !== String(flipped)
      ) {
        await evaluate(
          "document.querySelector('[data-review-face][aria-hidden=false] button:last-child').click()",
        );
      }
      await until(
        `document.querySelector('[data-review-card]').getAttribute('data-flipped') === '${flipped}'`,
      );
      const faces = await evaluate(`(function(){
        return Array.from(document.querySelectorAll('[data-review-face]')).map(function(el){
          var s=getComputedStyle(el);
          return {side:el.getAttribute('data-review-face'),visible:s.visibility==='visible',pointer:s.pointerEvents,transform:s.transform,height:el.clientHeight,scroll:el.scrollHeight};
        });
      })()`);
      assert.deepEqual(
        faces.filter((face) => face.visible).map((face) => face.side),
        [flipped ? "back" : "front"],
        "Only the selected card face is painted in the old WebView",
      );
      assert.equal(faces.find((face) => !face.visible).pointer, "none");
      assert.ok(faces.every((face) => face.transform === "none"));
      assert.ok(faces.every((face) => face.height >= 298));
      await screenshot(flipped ? "study-back.png" : "study-front.png");
      if (flipped) {
        // The back can exceed the card height; its toggle must remain reachable.
        await evaluate(
          "var back=document.querySelector('[data-review-face=back]');back.scrollTop=back.scrollHeight",
        );
      }
      assert.ok(
        await evaluate(`(function(){
          var face=document.querySelector('[data-review-face][aria-hidden=false]');
          var button=face.querySelector('button:last-child');
          button.scrollIntoView({block:'nearest'});
          var r=button.getBoundingClientRect();
          return button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
        })()`),
        "The visible face's toggle receives touch input",
      );
    }
    // No answers were submitted, so leaving the page records no study results.
    await evaluate(
      "history.pushState(null,'','/dashboard');dispatchEvent(new PopStateEvent('popstate'));",
    );
  } else {
    for (const direction of ["EN_TO_FA", "FA_TO_EN"]) {
      await send("Page.navigate", {
        url: origin + "/study?direction=" + direction,
      });
      await until("document.querySelector('[data-review-card]')");
      assert.equal(
        await evaluate(
          "document.querySelector('[data-review-face=front] p').textContent",
        ),
        direction === "EN_TO_FA" ? fixtureWord.eng : fixtureWord.per,
      );
      for (const flipped of [false, true, false]) {
        if (
          (await evaluate(
            "document.querySelector('[data-review-card]').getAttribute('data-flipped')",
          )) !== String(flipped)
        )
          await evaluate(
            "document.querySelector('[data-review-face][aria-hidden=false] button:last-child').click()",
          );
        await delay(650);
        assert.equal(
          await evaluate(
            "document.querySelector('[data-review-turn]').style.transform",
          ),
          flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        );
        assert.notEqual(
          await evaluate(
            "getComputedStyle(document.querySelector('[data-review-turn]')).transform",
          ),
          "none",
          "The modern card keeps its 3D animation",
        );
        assert.ok(
          await evaluate(`(function(){
          var face=document.querySelector('[data-review-face][aria-hidden=false]');
          var button=face.querySelector('button:last-child');button.scrollIntoView({block:'nearest'});
          var r=button.getBoundingClientRect();return button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
        })()`),
          "The modern face's toggle receives input",
        );
        await screenshot(
          `study-${direction}-${flipped ? "back" : "front"}.png`,
        );
      }
    }
    assert.equal(
      fixtureWrites,
      0,
      "Flipping a card must not submit study results",
    );
  }
  // Add isolated geometric fixtures after the actual production app has loaded.
  await evaluate(
    `(function(){
    var sheet=document.createElement('style');sheet.id='vf-fixture-style';sheet.textContent=${JSON.stringify(native ? compatFixture.css : fixtureCss)};document.head.appendChild(sheet);
    ${native ? "window.__VOCABFLOW_LAYOUT__.push.apply(window.__VOCABFLOW_LAYOUT__," + JSON.stringify(compatFixture.bindings.map((binding) => ({ ...binding, id: binding.id + 10000 }))) + ");" : ""}
    var fixture=document.createElement('div');fixture.id='vf-fixtures';fixture.style.cssText='position:absolute;top:0;left:0;background:white;z-index:999999;width:320px';
    fixture.innerHTML=['row','row rtl','row reverse','row rtl reverse','column','wrap','grid','row auto'].map(function(classes,i){return '<div id="vf-'+i+'" class="vf-test '+classes+'"><i class="item"></i><i class="item"></i><i class="item"></i></div>';}).join('')+'<div id="vf-aspect" class="vf-test aspect"></div><div id="vf-math" class="vf-test math"></div><div id="vf-logical" class="vf-test logical rtl"><i class="item"></i></div><div id="vf-color" class="vf-test colored">Color</div>';
    document.body.appendChild(fixture);
  })()`.replace(
      /--vf-(expr|math)-(\d+)\b/g,
      (_, kind, id) => "--vf-" + kind + "-" + (Number(id) + 10000),
    ),
  );
  await delay(1000);
  const geometry = await evaluate(`(function(){
    function rect(el){var r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,right:r.right};}
    return {rows:Array.from(document.querySelectorAll('#vf-fixtures .vf-test')).slice(0,8).map(function(el){return Array.from(el.children).map(rect)}),aspect:rect(document.querySelector('#vf-aspect')),math:rect(document.querySelector('#vf-math')),logical:rect(document.querySelector('#vf-logical .item')),logicalParent:rect(document.querySelector('#vf-logical')),color:getComputedStyle(document.querySelector('#vf-color')).color,viewport:innerHeight};
  })()`);
  if (process.env.VOCABFLOW_COMPAT_DEBUG === "1")
    console.log(JSON.stringify({ geometry }));
  const near = (actual, expected, label) =>
    assert.ok(
      Math.abs(actual - expected) < 1,
      `${label}: ${actual} vs ${expected}`,
    );
  for (const [index, sign] of [
    [0, 1],
    [1, -1],
    [2, -1],
    [3, 1],
  ])
    near(
      (geometry.rows[index][1].x - geometry.rows[index][0].x) * sign,
      44,
      "row/RTL/reverse gap",
    );
  near(geometry.rows[4][1].y - geometry.rows[4][0].y, 28, "column gap");
  near(geometry.rows[5][1].x - geometry.rows[5][0].x, 44, "wrapped main gap");
  near(geometry.rows[5][2].x, geometry.rows[5][0].x, "wrapped next row start");
  near(geometry.rows[5][2].y - geometry.rows[5][0].y, 28, "wrapped cross gap");
  near(geometry.rows[6][1].x - geometry.rows[6][0].x, 44, "grid gap");
  near(geometry.aspect.h, 120, "aspect ratio");
  near(geometry.math.w, 140, "min width");
  near(
    geometry.math.h,
    Math.max(20, Math.min(geometry.viewport * 0.05, 60)),
    "clamp height",
  );
  near(
    geometry.logicalParent.right - geometry.logical.right,
    12,
    "logical RTL inset",
  );
  assert.match(geometry.color, /^rgb\(230, 168, 2[56]\)$/); // one-step HSL rounding difference in old Chromium
  await evaluate("document.querySelector('#vf-0').classList.remove('row')");
  await delay(200);
  assert.equal(
    await evaluate(
      "document.querySelector('#vf-0').children[1].style.marginLeft",
    ),
    "",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Production selection and layout checks passed. Screenshots: " + artifacts,
  );
} finally {
  if (native && socket?.readyState === WebSocket.OPEN) {
    try {
      if (bridgeBootstrap)
        await send("Page.removeScriptToEvaluateOnNewDocument", bridgeBootstrap);
      await evaluate(
        "['vf-fixtures','vf-fixture-style'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove()})",
      );
      if (originalTheme === null)
        await evaluate("localStorage.removeItem('eng-theme')");
      else if (originalTheme !== undefined)
        await evaluate(
          "localStorage.setItem('eng-theme'," +
            JSON.stringify(originalTheme) +
            ")",
        );
    } catch {
      /* app may have closed */
    }
  }
  if (socket) socket.close();
  for (const promise of pending.values()) clearTimeout(promise.timer);
  if (browser) browser.kill();
  if (forward) adb("forward", "--remove", "tcp:" + forward);
  if (native) adb("reverse", "--remove", `tcp:${server.address().port}`);
  server.closeAllConnections();
  server.close();
}
