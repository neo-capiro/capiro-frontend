import { preview } from "/workspace/capiro-next-modules/node_modules/vite/dist/node/index.js";
await preview({configFile:false,root:"/workspace/capiro-next-modules/apps/web/test/browser",build:{outDir:"/tmp/capiro-next-modules-evidence/scope-preservation/red-harness"},preview:{host:"127.0.0.1",port:5197,strictPort:true},logLevel:"warn"});
console.log("Preserved 21503cf Calendar regression baseline on 5197");
