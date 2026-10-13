import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
const out='/tmp/capiro-unified-a11y-render-review-20261013';
const repo='/workspace/capiro-onboard-port-20261013';
const children=[];
async function launch(file,port){const child=spawn(process.execPath,[`${out}/${file}`],{cwd:repo,stdio:['ignore','pipe','pipe']});children.push(child);let log='';child.stdout.on('data',x=>log+=x);child.stderr.on('data',x=>log+=x);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preview readiness timeout')),30000);child.once('exit',x=>{clearTimeout(timer);reject(Error(`Preview exit ${x}: ${log}`));});child.stdout.on('data',()=>{if(log.includes(`http://127.0.0.1:${port}`)){clearTimeout(timer);resolve();}});});return()=>fs.writeFileSync(`${out}/${file}.log`,log);}
async function stop(c){if(c.exitCode!==null||c.signalCode!==null)return;const done=once(c,'exit');c.kill('SIGTERM');const timer=setTimeout(()=>c.kill('SIGKILL'),5000);try{await done;}finally{clearTimeout(timer);}}
const logs=[];let code=1;
try{logs.push(await launch('portfolio-server.mjs',5189));logs.push(await launch('shared-server.mjs',5198));fs.writeFileSync(`${out}/owned-processes.json`,JSON.stringify({wrapper:process.pid,servers:children.map(c=>c.pid)},null,2));const runner=spawn(process.execPath,[`${repo}/node_modules/@playwright/test/cli.js`,'test','--config',`${out}/playwright.config.mjs`],{cwd:repo,stdio:'inherit'});children.push(runner);[code]=await once(runner,'exit');}
finally{for(const c of children.reverse())await stop(c);logs.forEach(f=>f());const ports={};for(const port of [5189,5198])ports[port]=await new Promise(resolve=>{const s=net.connect(port,'127.0.0.1');s.once('connect',()=>{s.destroy();resolve('LISTENING');});s.once('error',e=>resolve(e.code));});fs.writeFileSync(`${out}/lease-release.json`,JSON.stringify({utc:new Date().toISOString(),exitCode:code,owned:children.map(c=>({pid:c.pid,exit:c.exitCode,signal:c.signalCode})),ports},null,2));process.exitCode=code??1;}
