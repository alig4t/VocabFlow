import { build, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { readFileSync } from "node:fs";
import path from "node:path";
import { generateCompatCss, compatInlineStyles } from "./compat-css.mjs";

export function conditionalCompat(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "vocabflow-conditional-compat",
    apply: "build",
    enforce: "post",
    configResolved(resolved) {
      config = resolved;
    },
    async generateBundle(_options, bundle) {
      const modernHtml = bundle["index.html"];
      if (!modernHtml || modernHtml.type !== "asset")
        throw new Error("Missing modern HTML entry");
      let html = String(modernHtml.source);
      const entry = html.match(
        /<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/,
      )?.[1];
      const styles = [
        ...html.matchAll(
          /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
        ),
      ].map((match) => match[1]);
      if (!entry || styles.length !== 1)
        throw new Error("Expected one modern JS entry and stylesheet");
      const css = Object.values(bundle).find(
        (item) => item.type === "asset" && item.fileName.endsWith(".css"),
      );
      if (!css || css.type !== "asset")
        throw new Error("Missing modern stylesheet");
      const compatible = await generateCompatCss(String(css.source));
      const cssName = `assets/compat-${compatible.hash}.css`;
      this.emitFile({
        type: "asset",
        fileName: cssName,
        source: compatible.css,
      });
      const nested = await build({
        configFile: false,
        root: config.root,
        mode: config.mode,
        base: config.base,
        publicDir: config.publicDir,
        resolve: { alias: config.resolve.alias },
        plugins: [
          react({ babel: { plugins: [compatInlineStyles] } }),
          legacy({
            targets: ["Chrome >= 61"],
            renderModernChunks: false,
            additionalLegacyPolyfills: [
              "abortcontroller-polyfill/dist/abortcontroller-polyfill-only",
            ],
          }),
        ],
        build: {
          write: false,
          emptyOutDir: false,
          // SystemJS chunks otherwise inject the ORIGINAL CSS into the document.
          // The loader already selects our separately generated compatible CSS.
          cssCodeSplit: false,
          rollupOptions: {
            input: path.join(config.root, "compat.html"),
            output: {
              entryFileNames: "assets/compat-[name]-[hash].js",
              chunkFileNames: "assets/compat-[name]-[hash].js",
            },
          },
        },
      });
      const outputs = (Array.isArray(nested) ? nested : [nested]) as {
        output: {
          type: string;
          fileName: string;
          source?: string | Uint8Array;
          code?: string;
        }[];
      }[];
      const files = outputs.flatMap((output) => output.output);
      const legacyHtml = files.find((file) => file.fileName === "compat.html");
      const markup = String(legacyHtml?.source ?? "");
      const polyfills = markup.match(
        /id="vite-legacy-polyfill"[^>]*src="([^"]+)"/,
      )?.[1];
      const compatibleEntry = markup.match(
        /id="vite-legacy-entry"[^>]*data-src="([^"]+)"/,
      )?.[1];
      if (!polyfills || !compatibleEntry)
        throw new Error("Missing compatibility JS bundles");
      for (const file of files) {
        if (file.fileName.endsWith(".html") || file.fileName.endsWith(".css"))
          continue;
        const source = file.type === "chunk" ? file.code! : file.source!;
        const existing = bundle[file.fileName];
        if (existing) {
          const original =
            existing.type === "chunk" ? existing.code : existing.source;
          if (!Buffer.from(source).equals(Buffer.from(original)))
            throw new Error(`Build collision: ${file.fileName}`);
        } else
          this.emitFile({ type: "asset", fileName: file.fileName, source });
      }
      html = html
        .replace(
          /<script\b[^>]*type="module"[^>]*src="[^"]+"[^>]*><\/script>/g,
          "",
        )
        .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, "");
      const assets = {
        modern: { entry, styles },
        compat: {
          entry: compatibleEntry,
          polyfills,
          styles: [config.base + cssName],
        },
        bindings: compatible.bindings,
      };
      const loader = readFileSync(
        path.join(config.root, "scripts/compat-loader.js"),
        "utf8",
      );
      modernHtml.source = html.replace(
        "</body>",
        `<script id="vocabflow-builds" type="application/json">${JSON.stringify(assets).replace(/</g, "\\u003c")}</script><script>${loader}</script></body>`,
      );
    },
  };
}
