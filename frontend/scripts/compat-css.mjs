import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { createHash } from "node:crypto";

const splitValues = (value) =>
  valueParser(value)
    .nodes.filter((n) => n.type !== "space")
    .map((n) => valueParser.stringify(n));
const viewport = (value) =>
  value.replace(/(-?(?:\d*\.)?\d+)d(vh|vw)\b/g, "calc($1 * var(--vf-$2))");
const directionSelector = (selector, direction) =>
  selector.replace(
    /(::[\w-]+(?:\([^)]*\))?)?$/,
    `[data-vf-dir="${direction}"]$1`,
  );

/** Build a SECOND stylesheet. Never mutate the modern Vite CSS asset. */
export async function generateCompatCss(css) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    // These are the :is/:where forms emitted by our Tailwind 3 configuration.
    rule.selector = rule.selectors
      .flatMap((selector) => {
        const rtl = ":where([dir=rtl],[dir=rtl] *)";
        return selector.includes(rtl)
          ? [
              selector.replace(rtl, "[dir=rtl]"),
              "[dir=rtl] " + selector.replace(rtl, ""),
            ]
          : [selector];
      })
      .join(",");
    if (rule.selector.includes(":is(.dark *)"))
      rule.selector = rule.selectors
        .map((selector) =>
          selector.includes(":is(.dark *)")
            ? ".dark " + selector.replace(/:is\(\.dark \*\)/g, "")
            : selector,
        )
        .join(",");
    rule.selector = rule.selector.replace(
      /:where\((:not\(\[[^\]]+\]\)|\[[^\]]+\])\)/g,
      "$1",
    );
    if (/:(is|where|has)\(/.test(rule.selector))
      throw new Error("Unsupported compatibility selector: " + rule.selector);
  });
  const bindings = [];
  const bindingKeys = new Map();
  const bind = (expression, property) => {
    const key = property + ":" + expression;
    if (!bindingKeys.has(key)) {
      const id = bindings.length;
      bindings.push({ id, expression, property });
      bindingKeys.set(key, id);
    }
    return bindingKeys.get(key);
  };
  const originalRules = [];
  root.walkRules((rule) => originalRules.push(rule));
  for (const rule of originalRules) {
    if (rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name))
      continue;
    const declarations = rule.nodes.filter((n) => n.type === "decl");
    const viewportDecls = [];
    const mathDecls = [];
    const logical = { ltr: [], rtl: [] };
    for (const decl of declarations) {
      const { prop, value, important } = decl;
      if (/d(vh|vw)\b/.test(value))
        viewportDecls.push(decl.clone({ value: viewport(value) }));
      if (/\b(?:min|max|clamp)\(/.test(value)) {
        const parsed = valueParser(value);
        const metadata = [];
        parsed.walk((node) => {
          if (node.type !== "function" || !/^(min|max|clamp)$/.test(node.value))
            return;
          const expression = valueParser.stringify(node);
          const id = bind(expression, prop);
          metadata.push(
            postcss.decl({
              prop: `--vf-expr-${id}`,
              // Preserve the expression literally: resolving env()/var() here
              // can invalidate the metadata before the runtime evaluates it.
              value: JSON.stringify(expression),
              important,
            }),
          );
          node.type = "word";
          node.value = `var(--vf-math-${id})`;
          delete node.nodes;
          return false;
        });
        mathDecls.push(...metadata, decl.clone({ value: parsed.toString() }));
      }
      if (prop === "height")
        rule.append(
          postcss.decl({
            prop: "--vf-specified-height",
            value: value === "auto" ? "0" : "1",
            important,
          }),
        );
      if (/^margin-(top|right|bottom|left)$/.test(prop))
        rule.append({
          prop: "--vf-auto-" + prop,
          value: value === "auto" ? "1" : "0",
          important,
        });
      if (prop === "margin") {
        const p = splitValues(value);
        const values = [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]];
        ["top", "right", "bottom", "left"].forEach((side, i) =>
          rule.append({
            prop: "--vf-auto-margin-" + side,
            value: values[i] === "auto" ? "1" : "0",
            important,
          }),
        );
      }
      if (prop === "aspect-ratio")
        rule.append(postcss.decl({ prop: "--vf-aspect", value, important }));
      if (prop === "gap") {
        const [row, column = row] = splitValues(value);
        decl.cloneBefore({ prop: "grid-gap" });
        rule.append(
          { prop: "--vf-gap-row", value: row, important },
          { prop: "--vf-gap-column", value: column, important },
        );
      }
      if (/^(row|column)-gap$/.test(prop)) {
        decl.cloneBefore({ prop: "grid-" + prop });
        rule.append({
          prop: "--vf-gap-" + prop.split("-")[0],
          value,
          important,
        });
      }
      if (prop === "inset") {
        const p = splitValues(value);
        const values = [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]];
        ["top", "right", "bottom", "left"].forEach((side, i) =>
          decl.cloneBefore({ prop: side, value: values[i] }),
        );
      }
      const alias = prop.match(
        /^(margin|padding|border)-inline-(start|end)(.*)$/,
      );
      if (alias)
        decl.cloneBefore({
          prop: `-webkit-${alias[1]}-${alias[2]}${alias[3]}`,
        });
      const axis = prop.match(/^(margin|padding|inset)-(inline|block)$/);
      if (axis) {
        const [start, end = start] = splitValues(value);
        if (axis[2] === "inline" && axis[1] !== "inset") {
          decl.cloneBefore({ prop: `-webkit-${axis[1]}-start`, value: start });
          decl.cloneBefore({ prop: `-webkit-${axis[1]}-end`, value: end });
        } else if (axis[2] === "block") {
          decl.cloneBefore({
            prop: axis[1] === "inset" ? "top" : `${axis[1]}-top`,
            value: start,
          });
          decl.cloneBefore({
            prop: axis[1] === "inset" ? "bottom" : `${axis[1]}-bottom`,
            value: end,
          });
        } else {
          logical.ltr.push(
            decl.clone({ prop: "left", value: start }),
            decl.clone({ prop: "right", value: end }),
          );
          logical.rtl.push(
            decl.clone({ prop: "right", value: start }),
            decl.clone({ prop: "left", value: end }),
          );
        }
      }
      const inset = prop.match(/^inset-inline-(start|end)$/);
      if (inset) {
        const start = inset[1] === "start";
        logical.ltr.push(decl.clone({ prop: start ? "left" : "right" }));
        logical.rtl.push(decl.clone({ prop: start ? "right" : "left" }));
      }
    }
    // Append within the original media rule, preserving its cascade and breakpoints.
    let after = rule;
    const appendFallback = (condition, nodes) => {
      if (!nodes.length) return;
      const support = postcss.atRule({ name: "supports", params: condition });
      support.append(rule.clone({ nodes }));
      after.after(support);
      after = support;
    };
    appendFallback("not (height: 1dvh)", viewportDecls);
    appendFallback("not (height: clamp(0px, 1px, 2px))", mathDecls);
    for (const direction of ["ltr", "rtl"]) {
      if (!logical[direction].length) continue;
      const support = postcss.atRule({
        name: "supports",
        params: "not (inset-inline-start: 0px)",
      });
      support.append(
        rule.clone({
          selector: rule.selectors
            .map((s) => directionSelector(s, direction))
            .join(","),
          nodes: logical[direction],
        }),
      );
      after.after(support);
      after = support;
    }
  }
  // Older engines accept comma HSL/RGB syntax. Keep theme values dynamic.
  root.walkDecls((decl) => {
    if (decl.prop.startsWith("--"))
      decl.value = decl.value.replace(
        /^(-?[\d.]+)\s+([\d.]+%)\s+([\d.]+%)$/,
        "$1,$2,$3",
      );
    const parsed = valueParser(decl.value);
    parsed.walk((node) => {
      if (
        node.type !== "function" ||
        !/^(hsl|rgb)a?$/.test(node.value) ||
        node.nodes.some((p) => p.type === "div" && p.value === ",")
      )
        return;
      let alpha = false;
      node.nodes = node.nodes.map((p) => {
        if (p.type === "space")
          return { type: "div", value: ",", before: "", after: "" };
        if (p.type === "div" && p.value === "/") {
          alpha = true;
          return { ...p, value: ",", before: "", after: "" };
        }
        return p;
      });
      if (alpha && !node.value.endsWith("a")) node.value += "a";
    });
    decl.value = parsed.toString();
  });
  const reset = postcss.rule({ selector: "*,::before,::after" });
  const properties = [
    "--vf-gap-row",
    "--vf-gap-column",
    "--vf-aspect",
    "--vf-specified-height",
    "--vf-inline-height",
    "--vf-inline-max-height",
    "--vf-inline-aspect-ratio",
    ...["top", "right", "bottom", "left"].map(
      (side) => "--vf-auto-margin-" + side,
    ),
    ...bindings.map((b) => `--vf-expr-${b.id}`),
  ];
  properties.forEach((prop) => reset.append({ prop, value: "initial" }));
  root.prepend(reset);
  // Old WebViews can paint both scrollable faces despite backface-visibility.
  // Only the selected compatibility stylesheet replaces the 3D flip with a
  // flat face switch; modern browsers retain the original animation.
  root.append(
    postcss.parse(`
      [data-review-card] { perspective: none !important; }
      [data-review-turn] {
        transform: none !important;
        transform-style: flat !important;
        transition: none !important;
      }
      [data-review-face] {
        transform: none !important;
        visibility: hidden;
        pointer-events: none;
      }
      [data-review-card][data-flipped="false"] [data-review-face="front"],
      [data-review-card][data-flipped="true"] [data-review-face="back"] {
        visibility: visible;
        pointer-events: auto;
      }
    `),
  );
  const result = root.toString();
  return {
    css: result,
    bindings,
    hash: createHash("sha256").update(result).digest("hex").slice(0, 12),
  };
}

/** Runs ONLY in the secondary build, so modern React source/output stays intact. */
export function compatInlineStyles({ types: t }) {
  const needsFallback = (node) => {
    if (t.isStringLiteral(node))
      return /d[vwh]|\b(min|max|clamp)\(/.test(node.value);
    if (t.isConditionalExpression(node))
      return needsFallback(node.consequent) || needsFallback(node.alternate);
    return false;
  };
  return {
    visitor: {
      JSXAttribute(path) {
        if (
          path.node.name.name !== "style" ||
          !t.isJSXExpressionContainer(path.node.value) ||
          !t.isObjectExpression(path.node.value.expression)
        )
          return;
        for (const property of path.node.value.expression.properties) {
          if (!t.isObjectProperty(property)) continue;
          const name = t.isIdentifier(property.key)
            ? property.key.name
            : property.key.value;
          if (
            ((name === "height" || name === "maxHeight") &&
              needsFallback(property.value)) ||
            name === "aspectRatio"
          ) {
            property.key = t.stringLiteral(
              "--vf-inline-" +
                name.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()),
            );
          }
        }
      },
    },
  };
}
