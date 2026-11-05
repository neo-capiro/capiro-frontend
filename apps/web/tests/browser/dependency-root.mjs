// Optional existing-install binding for isolated source checkouts. No copying,
// installation or donor mutation. Load with node --import (also in NODE_OPTIONS
// for the existing Playwright worker and local-server child processes).
import { registerHooks } from "node:module";
import { realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const configured = process.env.CAPIRO_COMPONENT_DEPENDENCIES;
if (configured) {
  if (!path.isAbsolute(configured))
    throw new Error("CAPIRO_COMPONENT_DEPENDENCIES must be absolute");
  const dependencies = realpathSync(configured);
  const donorURL = pathToFileURL(
    path.join(dependencies, "../package.json"),
  ).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (
          !["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"].includes(error.code) ||
          specifier.startsWith(".") ||
          specifier.startsWith("/") ||
          specifier.startsWith("#") ||
          specifier.includes(":")
        )
          throw error;
        // Preserve import/require export conditions, including ESM-only names.
        return nextResolve(specifier, { ...context, parentURL: donorURL });
      }
    },
  });
}
