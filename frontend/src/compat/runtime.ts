import { ResizeObserver as CompatibleResizeObserver } from "@juggle/resize-observer";
import { cssLength, type LengthContext } from "./math";

interface Binding {
  id: number;
  expression: string;
  property: string;
}
interface Features {
  flexGap: boolean;
  viewport: boolean;
  math: boolean;
  logical: boolean;
  aspect: boolean;
}
declare global {
  interface Window {
    __VOCABFLOW_FEATURES__?: Features;
    __VOCABFLOW_LAYOUT__?: Binding[];
  }
}

// This module is only present in the separately selected compatibility entry.
if (!window.ResizeObserver) window.ResizeObserver = CompatibleResizeObserver;
if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  };
}
const mediaPrototype = Object.getPrototypeOf(window.matchMedia("all"));
if (!mediaPrototype.addEventListener) {
  mediaPrototype.addEventListener = function (
    this: MediaQueryList,
    type: string,
    listener: Parameters<MediaQueryList["addListener"]>[0],
  ) {
    if (type === "change") this.addListener(listener);
  };
  mediaPrototype.removeEventListener = function (
    this: MediaQueryList,
    type: string,
    listener: Parameters<MediaQueryList["removeListener"]>[0],
  ) {
    if (type === "change") this.removeListener(listener);
  };
}

const features = window.__VOCABFLOW_FEATURES__!;
const bindings = window.__VOCABFLOW_LAYOUT__ ?? [];
const root = document.documentElement;
const managed = new Set<HTMLElement>();
const changed = new Set<HTMLElement>();
const ownStyles = new WeakMap<HTMLElement, string>();
const sizes = new WeakMap<Element, string>();
let scheduled = false;
let all = false;

function style(element: HTMLElement, property: string, value: string) {
  if (element.style.getPropertyValue(property) !== value)
    element.style.setProperty(property, value);
  ownStyles.set(element, element.getAttribute("style") ?? "");
}
const px = (value: number) => `${Math.round(value * 10000) / 10000}px`;
function context(
  element: HTMLElement,
  property: string,
  computed: CSSStyleDeclaration,
): LengthContext {
  const parent =
    element.offsetParent instanceof HTMLElement &&
    computed.position === "absolute"
      ? element.offsetParent
      : element.parentElement;
  const parentStyle = parent ? getComputedStyle(parent) : computed;
  const vertical = /^(?:min-|max-)?height$|^(?:top|bottom)$/.test(property);
  const width = parent
    ? parent.clientWidth -
      parseFloat(parentStyle.paddingLeft) -
      parseFloat(parentStyle.paddingRight)
    : innerWidth;
  const height = parent
    ? parent.clientHeight -
      parseFloat(parentStyle.paddingTop) -
      parseFloat(parentStyle.paddingBottom)
    : innerHeight;
  return {
    width: innerWidth,
    height: innerHeight,
    font: parseFloat(
      property === "font-size" ? parentStyle.fontSize : computed.fontSize,
    ),
    rootFont: parseFloat(getComputedStyle(root).fontSize),
    percent:
      property === "font-size"
        ? parseFloat(parentStyle.fontSize)
        : vertical
          ? height
          : width,
    variable: (name) => computed.getPropertyValue(name).trim(),
  };
}
function length(
  raw: string,
  element: HTMLElement,
  property: string,
  computed: CSSStyleDeclaration,
) {
  return cssLength(raw, context(element, property, computed));
}

interface MarginState {
  original: Record<string, string>;
  applied: Record<string, string>;
}
const margins = new WeakMap<HTMLElement, MarginState>();
const gapContainers = new WeakSet<HTMLElement>();
const marginNames = [
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
];
function restoreMargins(child: HTMLElement) {
  let saved = margins.get(child);
  if (!saved) {
    saved = { original: {}, applied: {} };
    margins.set(child, saved);
    for (const name of marginNames)
      saved.original[name] = child.style.getPropertyValue(name);
  }
  for (const name of marginNames) {
    const current = child.style.getPropertyValue(name);
    if (name in saved.applied && current !== saved.applied[name])
      saved.original[name] = current;
    style(child, name, saved.original[name]);
  }
  return saved;
}

/** Child margins supply gutters without moving the colored parent surface. */
function updateGap(element: HTMLElement, computed: CSSStyleDeclaration) {
  if (features.flexGap) return;
  const rowRaw = computed.getPropertyValue("--vf-gap-row").trim();
  const columnRaw = computed.getPropertyValue("--vf-gap-column").trim();
  if (!/^(inline-)?flex$/.test(computed.display) || (!rowRaw && !columnRaw)) {
    if (gapContainers.has(element)) {
      for (const node of Array.from(element.children)) {
        const child = node as HTMLElement;
        if (margins.has(child)) {
          restoreMargins(child);
          margins.delete(child);
        }
      }
      gapContainers.delete(element);
    }
    return;
  }
  gapContainers.add(element);
  const rowGap = length(rowRaw || "0px", element, "height", computed) ?? 0;
  const columnGap = length(columnRaw || "0px", element, "width", computed) ?? 0;
  const column = computed.flexDirection.startsWith("column");
  const reverse = computed.flexDirection.endsWith("reverse");
  const rtl = computed.direction === "rtl";
  const start = column
    ? reverse
      ? "margin-bottom"
      : "margin-top"
    : rtl !== reverse
      ? "margin-right"
      : "margin-left";
  const end = column
    ? reverse
      ? "margin-top"
      : "margin-bottom"
    : rtl !== reverse
      ? "margin-left"
      : "margin-right";
  const cross = column
    ? rtl
      ? "margin-right"
      : "margin-left"
    : computed.flexWrap === "wrap-reverse"
      ? "margin-bottom"
      : "margin-top";
  const mainGap = column ? rowGap : columnGap;
  const crossGap = column ? columnGap : rowGap;
  const items: {
    element?: HTMLElement;
    node: Node;
    size: number;
    line: number;
  }[] = [];
  let previousText = false;
  for (const node of Array.from(element.childNodes)) {
    if (node instanceof HTMLElement) {
      restoreMargins(node);
      const childStyle = getComputedStyle(node);
      if (
        childStyle.display === "none" ||
        /^(absolute|fixed)$/.test(childStyle.position)
      )
        continue;
      items.push({ element: node, node, size: 0, line: 0 });
      previousText = false;
    } else if (node instanceof SVGElement) {
      // SVGs in icon buttons also accept CSS margins; use the style-compatible view.
      const child = node as unknown as HTMLElement;
      restoreMargins(child);
      items.push({ element: child, node, size: 0, line: 0 });
      previousText = false;
    } else if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent?.trim() &&
      !previousText
    ) {
      items.push({ node, size: 0, line: 0 });
      previousText = true;
    }
  }
  if (computed.flexWrap !== "nowrap") {
    const flexStyles = new Map<HTMLElement, [string, string]>();
    for (const item of items)
      if (item.element) {
        flexStyles.set(item.element, [
          item.element.style.flexGrow,
          item.element.style.flexShrink,
        ]);
        style(item.element, "flex-grow", "0");
        style(item.element, "flex-shrink", "0");
      }
    for (const item of items) {
      const rect =
        item.node instanceof Element
          ? item.node.getBoundingClientRect()
          : (() => {
              const range = document.createRange();
              range.selectNode(item.node);
              return range.getBoundingClientRect();
            })();
      const childStyle = item.element ? getComputedStyle(item.element) : null;
      const before = childStyle
        ? parseFloat(childStyle.getPropertyValue(start)) || 0
        : 0;
      const after = childStyle
        ? parseFloat(childStyle.getPropertyValue(end)) || 0
        : 0;
      item.size = (column ? rect.height : rect.width) + before + after;
    }
    for (const [child, [grow, shrink]] of flexStyles) {
      style(child, "flex-grow", grow);
      style(child, "flex-shrink", shrink);
    }
    const available = column
      ? element.clientHeight -
        parseFloat(computed.paddingTop) -
        parseFloat(computed.paddingBottom)
      : element.clientWidth -
        parseFloat(computed.paddingLeft) -
        parseFloat(computed.paddingRight);
    let occupied = 0;
    let line = 0;
    items.forEach((item, index) => {
      if (index && occupied + mainGap + item.size > available + 0.5) {
        line++;
        occupied = 0;
      }
      item.line = line;
      occupied += (occupied ? mainGap : 0) + item.size;
    });
  }
  const additions = new Map<HTMLElement, Record<string, number>>();
  const add = (child: HTMLElement, name: string, value: number) => {
    const record = additions.get(child) ?? {};
    record[name] = (record[name] ?? 0) + value;
    additions.set(child, record);
  };
  items.forEach((item, index) => {
    const previous = items[index - 1];
    if (previous && previous.line === item.line) {
      const auto =
        item.element &&
        (margins.get(item.element)?.original[start] === "auto" ||
          getComputedStyle(item.element)
            .getPropertyValue("--vf-auto-" + start)
            .trim() === "1");
      if (item.element && !auto) add(item.element, start, mainGap);
      else if (previous.element) add(previous.element, end, mainGap);
    }
    if (item.line > 0 && item.element) add(item.element, cross, crossGap);
  });
  for (const item of items)
    if (item.element) {
      const child = item.element;
      const original = getComputedStyle(child);
      const saved = margins.get(child)!;
      for (const [name, amount] of Object.entries(additions.get(child) ?? {})) {
        if (
          saved.original[name] === "auto" ||
          original.getPropertyValue("--vf-auto-" + name).trim() === "1"
        )
          continue;
        style(
          child,
          name,
          px((parseFloat(original.getPropertyValue(name)) || 0) + amount),
        );
      }
      for (const name of marginNames)
        saved.applied[name] = child.style.getPropertyValue(name);
    }
}

const aspectHeights = new WeakMap<HTMLElement, string>();
function update(element: HTMLElement) {
  const computed = getComputedStyle(element);
  if (!features.logical)
    element.setAttribute("data-vf-dir", computed.direction);
  for (const binding of bindings) {
    const raw = computed.getPropertyValue(`--vf-expr-${binding.id}`).trim();
    if (!raw) continue;
    const result = length(JSON.parse(raw), element, binding.property, computed);
    if (result !== null) style(element, `--vf-math-${binding.id}`, px(result));
  }
  for (const property of ["height", "max-height"]) {
    const raw = computed.getPropertyValue("--vf-inline-" + property).trim();
    if (raw) {
      const result = length(raw, element, property, computed);
      if (result !== null) style(element, property, px(result));
    }
  }
  if (!features.aspect) {
    const ratio =
      computed.getPropertyValue("--vf-inline-aspect-ratio").trim() ||
      computed.getPropertyValue("--vf-aspect").trim();
    if (
      (!ratio ||
        computed.getPropertyValue("--vf-specified-height").trim() === "1") &&
      aspectHeights.has(element)
    ) {
      if (aspectHeights.get(element) === element.style.height)
        style(element, "height", "");
      aspectHeights.delete(element);
    }
    if (
      ratio &&
      computed.getPropertyValue("--vf-specified-height").trim() !== "1" &&
      (!element.style.height ||
        aspectHeights.get(element) === element.style.height)
    ) {
      const [w, h = "1"] = ratio.split("/");
      const result =
        element.getBoundingClientRect().width / (Number(w) / Number(h));
      if (Number.isFinite(result)) {
        const next = px(result);
        style(element, "height", next);
        aspectHeights.set(element, next);
      }
    }
  }
  updateGap(element, computed);
}

function relevant(computed: CSSStyleDeclaration) {
  return !!(
    computed.getPropertyValue("--vf-gap-row").trim() ||
    computed.getPropertyValue("--vf-gap-column").trim() ||
    computed.getPropertyValue("--vf-aspect").trim() ||
    computed.getPropertyValue("--vf-inline-height").trim() ||
    computed.getPropertyValue("--vf-inline-max-height").trim() ||
    computed.getPropertyValue("--vf-inline-aspect-ratio").trim() ||
    bindings.some((binding) =>
      computed.getPropertyValue(`--vf-expr-${binding.id}`).trim(),
    )
  );
}
function inspect(element: HTMLElement) {
  const computed = getComputedStyle(element);
  if (!features.logical)
    element.setAttribute("data-vf-dir", computed.direction);
  if (relevant(computed)) {
    managed.add(element);
    resize.observe(element);
  }
}
function scan(element: HTMLElement) {
  inspect(element);
  element.querySelectorAll<HTMLElement>("*").forEach((child) => inspect(child));
}
function schedule(global = false) {
  all ||= global;
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    style(root, "--vf-vh", px(innerHeight / 100));
    style(root, "--vf-vw", px(innerWidth / 100));
    if (all) scan(root);
    else for (const element of changed) if (element.isConnected) scan(element);
    changed.clear();
    all = false;
    for (const element of managed) {
      if (!element.isConnected) {
        managed.delete(element);
        resize.unobserve(element);
        continue;
      }
      update(element);
    }
    for (const element of managed) {
      const rect = element.getBoundingClientRect();
      sizes.set(element, `${rect.width}:${rect.height}`);
    }
  });
}
const resize = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const rect = entry.target.getBoundingClientRect();
    if (sizes.get(entry.target) !== `${rect.width}:${rect.height}`) {
      schedule();
      break;
    }
  }
});
new MutationObserver((records) => {
  let dirty = false;
  for (const record of records) {
    if (record.type === "childList") {
      if (record.target instanceof HTMLElement) {
        changed.add(record.target);
        dirty = true;
      }
      for (const node of Array.from(record.addedNodes))
        if (node instanceof HTMLElement) {
          changed.add(node);
          dirty = true;
        }
    } else if (record.target instanceof HTMLElement) {
      if (
        record.attributeName === "style" &&
        ownStyles.get(record.target) ===
          (record.target.getAttribute("style") ?? "")
      )
        continue;
      changed.add(record.target);
      dirty = true;
      if (record.target === root) all = true;
    }
  }
  if (dirty) schedule();
}).observe(root, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "style", "dir"],
});
addEventListener("resize", () => schedule(true));
document.fonts?.ready.then(() => schedule(true));
schedule(true);
