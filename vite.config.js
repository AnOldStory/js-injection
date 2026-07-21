import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync } from "fs";

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

        const files = ["background.js", "injection.js", "icon128.png", "manifest.json"];
        files.forEach((file) => {
          const src = path.resolve(__dirname, "public", file);
          const dest = path.resolve(distDir, file);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`[copy-extension-files] Copied ${file}`);
          } else {
            console.warn(`[copy-extension-files] Source not found: ${file}`);
          }
        });
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
