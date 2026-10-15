import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { generateCompatCss } from "../scripts/compat-css.mjs";
import postcss from "postcss";

const compiled = await build({
  entryPoints: ["src/compat/math.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { cssLength } = await import(
  "data:text/javascript;base64," +
    Buffer.from(compiled.outputFiles[0].text).toString("base64")
);
const context = {
  width: 360,
  height: 640,
  font: 20,
  rootFont: 16,
  percent: 200,
  variable: (name) =>
    ({ "--safe-top": "max(0px, var(--safe-top-px))", "--safe-top-px": "24px" })[
      name
    ] ?? "",
};
test("CSS math preserves nested bounds, percentages, safe area and viewport sizing", () => {
  for (const [expression, expected] of [
    ["min(8.75rem, 100%)", 140],
    ["clamp(200px, 10vw, 100px)", 200],
    ["clamp(1.75rem, 5vw, 2.5rem)", 28],
    ["max(1rem, calc(2em + 10%))", 60],
    ["calc((100dvh - var(--safe-top)) / 2)", 308],
    ["calc(3 * 2rem + 8px)", 104],
    ["var(--missing, 2rem)", 32],
  ])
    assert.equal(cssLength(expression, context), expected, expression);
  assert.equal(cssLength("not-a-length", context), null);
});
test("secondary stylesheet converts selectors and colors and keeps responsive fallbacks scoped", async () => {
  const source =
    ":root{--primary:42 80% 50%}.dark\\:bg:is(.dark *){color:hsl(var(--primary)/.5)}@media(min-width:400px){.box{display:flex;gap:8px 12px;width:min(100%,30rem);height:100dvh;inset-inline-start:12px}}.rtl\\:x:where([dir=rtl],[dir=rtl] *){margin:0 auto}";
  const result = await generateCompatCss(source);
  assert.match(result.css, /--primary:42,80%,50%/);
  assert.match(result.css, /hsla\(var\(--primary\),\.5\)/);
  assert.match(result.css, /\.dark \.dark/);
  assert.doesNotMatch(result.css, /:(?:is|where)\(/);
  assert.match(result.css, /--vf-gap-column:12px/);
  assert.match(result.css, /data-vf-dir="rtl"/);
  assert.match(result.css, /calc\(100 \* var\(--vf-vh\)\)/);
  assert.deepEqual(result.bindings, [
    { id: 0, expression: "min(100%,30rem)", property: "width" },
  ]);
  assert.ok(source.includes("height:100dvh")); // input and modern asset stay immutable
});

test("safe-area metadata remains literal until the compatibility runtime resolves it", async () => {
  const expression = "max(env(safe-area-inset-top), var(--safe-top-px))";
  const result = await generateCompatCss(
    ":root{--safe-top-px:24px;--safe-top:" + expression + "}",
  );
  let literal;
  postcss.parse(result.css).walkDecls("--vf-expr-0", (declaration) => {
    if (declaration.value !== "initial")
      literal = JSON.parse(declaration.value);
  });
  assert.equal(literal, expression);
  assert.equal(cssLength(literal, context), 24);
});
