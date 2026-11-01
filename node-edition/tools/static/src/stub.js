// Placeholder for Node-only modules (fs, os, child_process, sqlite) that the browser edition never actually calls.
export const existsSync = () => false; export const statSync = () => ({ isFile: () => false }); export const readFileSync = () => ''; export const mkdirSync = () => {};
export const networkInterfaces = () => ({}); export const spawn = () => ({ on() { return this; }, unref() {} });
export class DatabaseSync { constructor() { throw new Error('node:sqlite is not available in the browser'); } }
export default {};
