const NativeRequest=globalThis.Request;
globalThis.Request=class extends NativeRequest {
 constructor(...args){super(...args);if(this.url.includes('/api/action-followthrough/'))process.stderr.write(JSON.stringify({diagnosticRequestURL:this.url,origin:this.headers.get('origin'),host:this.headers.get('host'),contentEncoding:this.headers.get('content-encoding')})+'\n');}
};
