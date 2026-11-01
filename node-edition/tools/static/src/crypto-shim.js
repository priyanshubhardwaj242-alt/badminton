// Browser replacement for the few node:crypto functions the server uses. scrypt/sha256 are pure JS (noble), so password hashes are
// identical to the Node edition (scrypt N=16384, r=8, p=1, 64 bytes).
import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha2.js';
import { scrypt } from '@noble/hashes/scrypt.js';
export const randomBytes = n => { // the bundled Buffer has no 'base64url', so add it
  const b = Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(n))), plain = Buffer.prototype.toString;
  b.toString = enc => enc === 'base64url' ? plain.call(b, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : plain.call(b, enc);
  return b;
};
export const randomInt = n => { const lim = Math.floor(2 ** 32 / n) * n; let x; do { x = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= lim); return x % n; };
export const scryptSync = (pw, salt, len) => Buffer.from(scrypt(typeof pw === 'string' ? pw : new Uint8Array(pw), new Uint8Array(salt), { N: 16384, r: 8, p: 1, dkLen: len }));
export const timingSafeEqual = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
export const createHash = () => { const parts = []; return { update(t) { parts.push(Buffer.from(String(t))); return this; }, digest(enc) { return Buffer.from(sha256(new Uint8Array(Buffer.concat(parts)))).toString(enc); } }; };
export default { randomBytes, randomInt, scryptSync, timingSafeEqual, createHash };
