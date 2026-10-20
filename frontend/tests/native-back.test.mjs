// Real navigation handler; only React/router/Capacitor boundaries are replaced.
// Run from frontend/: node --test tests/native-back.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents:
      "export { NativeBackButton } from './src/components/layout/NativeBackButton';",
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "native-back-boundaries",
      setup(builder) {
        builder.onResolve(
          {
            filter:
              /^react$|^react-router-dom$|^@capacitor\/app$|(?:^|\/)lib\/platform$/,
          },
          ({ path }) => ({ path, namespace: "fixture" }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          loader: "js",
          contents:
            path === "react"
              ? "export const useEffect=effect=>{globalThis.fixture.cleanup=effect();};"
              : path === "react-router-dom"
                ? "export const useNavigate=()=>{const state=globalThis.fixture;return delta=>state.navigation.push(delta);};"
                : path === "@capacitor/app"
                  ? `const state=globalThis.fixture;
                export const App={
                  addListener:async(event,listener)=>{state.listener=listener;return {remove(){state.removed++;}};},
                  exitApp:()=>{state.exits++;}
                };`
                  : "export const isNative=()=>globalThis.fixture.native;",
        }));
      },
    },
  ],
});
let moduleId = 0;

async function mount({
  path = "/subscription",
  dialog = false,
  sidebar = false,
  native = true,
} = {}) {
  const state = {
    native,
    navigation: [],
    exits: 0,
    removed: 0,
    listener: null,
    cleanup: null,
  };
  globalThis.fixture = state;
  globalThis.window = { location: { pathname: path } };
  globalThis.document = new EventTarget();
  state.sidebar = new EventTarget();
  document.querySelector = (selector) =>
    selector.includes('role="dialog"')
      ? dialog
        ? {}
        : null
      : sidebar
        ? state.sidebar
        : null;
  globalThis.KeyboardEvent = class extends Event {
    constructor(type, options) {
      super(type, options);
      this.key = options.key;
    }
  };
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(`// case ${moduleId++}\n${bundle.outputFiles[0].text}`).toString("base64")}`
  );
  api.NativeBackButton();
  await new Promise((resolve) => setImmediate(resolve));
  return state;
}

test("back with an open dialog sends Escape instead of navigating", async () => {
  const state = await mount({ dialog: true });
  const keys = [];
  document.addEventListener("keydown", (event) =>
    keys.push({ key: event.key, cancelable: event.cancelable }),
  );
  state.listener();
  assert.deepEqual(keys, [{ key: "Escape", cancelable: true }]);
  assert.deepEqual(state.navigation, []);
  assert.equal(state.exits, 0);
  state.cleanup();
});

test("a dialog that prevents dismissal also prevents navigating or exiting", async () => {
  const state = await mount({ dialog: true, path: "/dashboard" });
  let received = false;
  document.addEventListener("keydown", (event) => {
    received = true;
    event.preventDefault();
  });
  state.listener();
  assert.equal(received, true);
  assert.deepEqual(state.navigation, []);
  assert.equal(state.exits, 0);
  state.cleanup();
});

test("back with an open sidebar dismisses it before navigating or exiting", async () => {
  for (const path of ["/subscription", "/dashboard", "/"]) {
    const state = await mount({ path, sidebar: true });
    const keys = [];
    state.sidebar.addEventListener("keydown", (event) => keys.push(event.key));
    state.listener();
    assert.deepEqual(keys, ["Escape"]);
    assert.deepEqual(state.navigation, []);
    assert.equal(state.exits, 0);
    state.cleanup();
  }
});

test("an open dialog takes precedence over the sidebar", async () => {
  const state = await mount({ dialog: true, sidebar: true });
  let sidebarKeys = 0;
  state.sidebar.addEventListener("keydown", () => sidebarKeys++);
  let dialogKeys = 0;
  document.addEventListener("keydown", () => dialogKeys++);
  state.listener();
  assert.equal(dialogKeys, 1);
  assert.equal(sidebarKeys, 0);
  assert.deepEqual(state.navigation, []);
  assert.equal(state.exits, 0);
  state.cleanup();
});

test("without a dialog back on a content page still navigates one step", async () => {
  const state = await mount();
  state.listener();
  assert.deepEqual(state.navigation, [-1]);
  assert.equal(state.exits, 0);
  state.cleanup();
  assert.equal(state.removed, 1);
});

test("without a dialog both home paths still exit the native app", async () => {
  for (const path of ["/dashboard", "/"]) {
    const state = await mount({ path });
    state.listener();
    assert.deepEqual(state.navigation, []);
    assert.equal(state.exits, 1);
    state.cleanup();
  }
});

test("web never registers a native back listener", async () => {
  const state = await mount({ native: false, dialog: true });
  assert.equal(state.listener, null);
  assert.deepEqual(state.navigation, []);
  assert.equal(state.exits, 0);
});
