const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!/^https?:\/\/127\.0\.0\.1(?::\d+)?\//.test(url)) {
    const error = new Error('Diagnostic prevented external request before network: ' + url);
    console.error(error.stack);
    return Promise.reject(error);
  }
  return original(input, init);
};
