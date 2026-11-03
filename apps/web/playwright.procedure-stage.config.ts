import { defineConfig } from "@playwright/test";
import component from "./playwright.config";

/**
 * SOURCE STAGE ONLY opt-in browser run for the mounted procedure picker stage. It reuses the
 * standard synthetic component server and matches only `procedure-selection.stage.ts`, so the
 * default `*.spec.ts` suite and the installed immutable contract package are unchanged.
 */
export default defineConfig({
  ...component,
  testMatch: "procedure-selection.stage.ts",
});
