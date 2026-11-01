// There is no network server in the browser: createServer just remembers the request handler so the engine can call it directly.
export function createServer(handler) { return { handler, on() {}, listen() {}, close(cb) { if (cb) cb(); }, closeAllConnections() {}, address() { return { port: 0 }; } }; }
export default { createServer };
