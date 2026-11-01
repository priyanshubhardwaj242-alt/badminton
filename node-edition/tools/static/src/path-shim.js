export const sep = '/';
export const join = (...p) => p.join('/').replace(/\/+/g, '/');
export const normalize = p => p;
export const dirname = p => p.replace(/\/[^/]*$/, '') || '/';
export const extname = p => (/\.[^./]+$/.exec(p) || [''])[0];
export default { sep, join, normalize, dirname, extname };
