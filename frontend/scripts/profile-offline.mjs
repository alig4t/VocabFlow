// Read-only measurements of this checkout's repository over an installed
// debug APK's native SQLite bridge. This does not measure release startup/FPS.
// Node 20: node --experimental-websocket scripts/profile-offline.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { build } from "esbuild";

const { values } = parseArgs({
  options: {
    serial: { type: "string" },
    output: { type: "string" },
    samples: { type: "string", default: "7" },
  },
});
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 2 || samples > 30) {
  throw new Error(
    "--samples must be between 2 and 30 (first sample is warm-up)",
  );
}
if (typeof WebSocket === "undefined") {
  throw new Error("On Node 20, use node --experimental-websocket");
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adb = (...args) =>
  execFileSync(
    "adb",
    [...(values.serial ? ["-s", values.serial] : []), ...args],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  ).trim();
const pid = adb("shell", "pidof", "ir.vocabflow.app");
if (!/^\d+$/.test(pid)) throw new Error("Open the seeded debug APK first");
let port;
let socket;
let scriptLoaded = false;
const pending = new Map();
let nextId = 0;
const call = (method, params = {}) =>
  new Promise((resolveCall, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(
        new Error(`${method} timed out; a native query may still be running`),
      );
    }, 30000);
    pending.set(id, { resolveCall, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text,
    );
  }
  return result.result.value;
};

try {
  port = adb(
    "forward",
    "tcp:0",
    `localabstract:webview_devtools_remote_${pid}`,
  );
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const target = targets.find(
    (t) => t.type === "page" && t.url.startsWith("https://localhost"),
  );
  if (!target)
    throw new Error(
      "Debug WebView unavailable; open the app and finish seeding",
    );
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    socket.addEventListener("open", ok, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timeout);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolveCall(message.result);
  });
  if (await evaluate("typeof window.__vocabflowPerfRepo !== 'undefined'")) {
    throw new Error("Another performance audit is already loaded");
  }
  const shim = `
    export async function query(statement, values = []) {
      const start = performance.now();
      const result = await Capacitor.Plugins.CapacitorSQLite.query({
        database: 'vocabflow', statement, values, readonly: false
      });
      window.__vocabflowPerfQueries.push({ms: performance.now()-start, rows: result.values?.length ?? 0});
      return result.values ?? [];
    }
    export function run() { throw new Error('Audit is read-only; finish app initialization first'); }
    export const uid = () => crypto.randomUUID();
  `;
  const bundle = await build({
    stdin: {
      contents: readFileSync(resolve(root, "src/offline/repo.ts"), "utf8"),
      resolveDir: resolve(root, "src/offline"),
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "window.__vocabflowPerfRepo",
    plugins: [
      {
        name: "read-only-audit",
        setup(builder) {
          builder.onResolve({ filter: /^\.\/db$/ }, () => ({
            path: "db",
            namespace: "audit",
          }));
          builder.onLoad({ filter: /.*/, namespace: "audit" }, () => ({
            contents: shim,
          }));
        },
      },
    ],
  });
  await evaluate(
    bundle.outputFiles[0].text + "; window.__vocabflowPerfQueries = []; true",
  );
  scriptLoaded = true;
  const measurements = await evaluate(`(async () => {
    const repo = window.__vocabflowPerfRepo;
    const output = {};
    const readers = {
      dashboard: () => repo.getDashboard(),
      study: () => repo.getStudyToday(),
      notification: () => repo.getNotificationStatus(),
      words20: () => repo.getWords({limit:20}),
      words500: () => repo.getWords({limit:500})
    };
    for (const [name, read] of Object.entries(readers)) {
      const runs = [];
      for (let i=0; i<${samples}; i++) {
        window.__vocabflowPerfQueries = [];
        const start = performance.now();
        await read();
        runs.push({ms:performance.now()-start, queries:window.__vocabflowPerfQueries.length,
          returnedRows:window.__vocabflowPerfQueries.reduce((s,q)=>s+q.rows,0)});
      }
      const times = runs.slice(1).map(r=>r.ms).sort((a,b)=>a-b);
      const middle = Math.floor(times.length/2);
      output[name] = {medianMs: times.length%2 ? times[middle] : (times[middle-1]+times[middle])/2, runs};
    }
    return output;
  })()`);
  const output = {
    measuredAt: new Date().toISOString(),
    android: adb("shell", "getprop", "ro.build.version.release"),
    method:
      "Current checkout readers over installed debug APK SQLite; first sample excluded",
    measurements,
  };
  if (values.output)
    writeFileSync(values.output, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify(output, null, 2));
} finally {
  if (scriptLoaded) {
    await evaluate(
      "delete window.__vocabflowPerfRepo; delete window.__vocabflowPerfQueries;",
    ).catch(() => {});
  }
  for (const request of pending.values()) clearTimeout(request.timeout);
  socket?.close();
  if (port) adb("forward", "--remove", `tcp:${port}`);
}
