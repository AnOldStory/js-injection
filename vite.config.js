import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js,tsx,ts}",
    }),
    /* After build: copy Chrome extension static files into dist/ */
    {
      name: "copy-extension-files",
      closeBundle() {
        const distDir = path.resolve(__dirname, "dist");
        if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

        const files = [
          "background.js",
          "injection.js",
          "icon128.png",
          "manifest.json",
          "offscreen.html",
          "offscreen.js",
          "url-match.js",
          "rule-store.js",
          "libraries.js",
          "mcp-url.js",
          "execute.js",
          "unlock-page.js",
        ];
        files.forEach((file) => {
          const src = path.resolve(__dirname, "public", file);
          const dest = path.resolve(distDir, file);
          if (!existsSync(src)) {
            /* A missing runtime file means dist/ is not a loadable extension.
               Fail the build instead of shipping a silently broken zip. */
            throw new Error(`[copy-extension-files] Missing runtime file: public/${file}`);
          }
          copyFileSync(src, dest);
          console.log(`[copy-extension-files] Copied ${file}`);
        });

        // Copy _locales directory recursively
        const copyDir = (srcDir, destDir) => {
          if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
          const entries = readdirSync(srcDir, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.resolve(srcDir, entry.name);
            const destPath = path.resolve(destDir, entry.name);
            if (entry.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          }
        };

        const localesSrc = path.resolve(__dirname, "public", "_locales");
        if (!existsSync(localesSrc)) {
          throw new Error("[copy-extension-files] Missing public/_locales directory");
        }
        copyDir(localesSrc, path.resolve(distDir, "_locales"));
        console.log("[copy-extension-files] Copied _locales directory");

        /* Bundled libraries injected with chrome.scripting.executeScript. */
        const vendorSrc = path.resolve(__dirname, "public", "vendor");
        if (!existsSync(vendorSrc)) {
          throw new Error("[copy-extension-files] Missing public/vendor directory");
        }
        copyDir(vendorSrc, path.resolve(distDir, "vendor"));
        console.log("[copy-extension-files] Copied vendor directory");

        /* The manifest is the source of truth for what Chrome loads.  Verify
           every referenced file exists, and that every copied module only
           imports files that were copied too.  This catches a forgotten entry
           in the list above before a broken zip reaches the store. */
        const manifest = JSON.parse(
          readFileSync(path.resolve(distDir, "manifest.json"), "utf8")
        );
        const referenced = new Set([
          manifest.background?.service_worker,
          manifest.options_page,
          manifest.options_ui?.page,
          manifest.action?.default_popup,
          ...(manifest.content_scripts || []).flatMap((entry) => entry.js || []),
          ...Object.values(manifest.icons || {}),
          ...Object.values(manifest.action?.default_icon || {}),
        ]);
        for (const ref of referenced) {
          if (ref && !existsSync(path.resolve(distDir, ref))) {
            throw new Error(
              `[copy-extension-files] manifest references missing file: ${ref}`
            );
          }
        }

        const importRe = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.\/[^"']+)["']/g;
        for (const file of files.filter((name) => name.endsWith(".js"))) {
          const source = readFileSync(path.resolve(distDir, file), "utf8");
          let match;
          while ((match = importRe.exec(source))) {
            if (!existsSync(path.resolve(distDir, match[1]))) {
              throw new Error(
                `[copy-extension-files] ${file} imports missing file: ${match[1]}`
              );
            }
          }
        }
      },
    },
  ],

  resolve: {
    alias: {
      /* Maintain original absolute imports used throughout the codebase */
      _variables: path.resolve(__dirname, "src/_variables.js"),
      store: path.resolve(__dirname, "src/store"),
      container: path.resolve(__dirname, "src/container"),
      component: path.resolve(__dirname, "src/component"),
      /* Extension-owned runtime modules shared with the UI (no duplicated
         URL matching / storage validation in the React bundle). */
      shared: path.resolve(__dirname, "public"),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    /* ace-builds is inherently large (~530KB minified) — raise limit accordingly */
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-redux", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit"],
          "vendor-ace": ["ace-builds", "react-ace"],
          "vendor-icons": [
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/react-fontawesome",
          ],
        },
      },
    },
  },

  /* Chrome Extension popup requires relative asset paths */
  base: "./",
  /* Don't let Vite auto-copy manifest.json — we handle it manually above */
  publicDir: false,
});
