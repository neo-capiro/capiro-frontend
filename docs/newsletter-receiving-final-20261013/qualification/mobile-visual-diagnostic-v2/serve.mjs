import { preview } from '/workspace/capiro-newsletter-port/node_modules/vite/dist/node/index.js';
await preview({configFile:false,root:'/workspace/capiro-newsletter-port/apps/web/test/browser',build:{outDir:'/workspace/capiro-newsletter-port/apps/web/.qa/modules-harness'},preview:{host:'127.0.0.1',port:5197,strictPort:true},logLevel:'warn'});
