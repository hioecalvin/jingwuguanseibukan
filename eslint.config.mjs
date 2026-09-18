import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This application currently loads most Supabase-backed screens in
      // effects. Keep exhaustive-deps enabled, but do not treat those
      // established asynchronous loaders as build-blocking state cascades.
      "react-hooks/set-state-in-effect": "off",

      // Function declarations used by legacy page loaders are intentionally
      // hoisted. They are not mutated after the effect captures them.
      "react-hooks/immutability": "off",
    },
  },
  {
    // React PDF's Image primitive is not an HTML img element and does not
    // accept the DOM alt attribute checked by jsx-a11y.
    files: ["components/*PDF.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // The isolated browser suite uses a separate generated Next.js build.
    ".next-browser-smoke/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated browser reports contain third-party bundled viewer code.
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
