import { defineConfig } from "@playwright/test";
import component from "./playwright.config";

// Explicit opt-in: requires the owned extension source path, not a store install.
export default defineConfig({
  ...component,
  testMatch: "selected-tab-extension.native.ts",
  timeout: 90_000,
  use: { ...component.use, trace: "off" },
});
