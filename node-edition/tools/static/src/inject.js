export { Buffer } from 'buffer';
export const process = { env: {}, argv: [], platform: 'browser', stdout: {}, uptime: () => Math.round(performance.now() / 1000), on() {}, exit() {}, memoryUsage: () => ({}) };
