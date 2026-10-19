import { preview } from "/workspace/capiro-onboard-port-20261013/node_modules/vite/dist/node/index.js";
const app = "/workspace/capiro-onboard-port-20261013/apps/web";
await preview({
  configFile: false,
  root: `${app}/test/browser`,
  publicDir: `${app}/public`,
  build: { outDir: `${app}/.qa/modules-harness` },
  preview: { host: "127.0.0.1", port: 5198, strictPort: true },
  logLevel: "warn",
});
console.log("Capture-only existing Modules preview http://127.0.0.1:5198");
