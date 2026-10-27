import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";

const commonRules = {
  ...js.configs.recommended.rules,
  "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
  "no-console": "off",
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/vendor/**",
      "STOREIMG/**",
      "*.zip",
    ],
  },

  /* Extension runtime + UI sources. */
  {
    files: ["src/**/*.{js,jsx}", "public/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: commonRules,
  },

  /* React-specific rules only for the UI (public/*.js are plain modules). */
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 19 automatic JSX transform
      "react/prop-types": "off", // prop-types not used
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
    settings: {
      react: { version: "detect" },
    },
  },

  /* Node-side code: MCP server, build scripts, tests. */
  {
    files: [
      "mcp-server.js",
      "mcp-server-example.mjs",
      "scripts/**/*.mjs",
      "test/**/*.mjs",
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: commonRules,
  },

  /* Playwright page.evaluate callbacks run in the browser context. */
  {
    files: ["scripts/capture-ui.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: commonRules,
  },

  /* Config files. */
  {
    files: ["eslint.config.js", "vite.config.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: commonRules,
  },
];
