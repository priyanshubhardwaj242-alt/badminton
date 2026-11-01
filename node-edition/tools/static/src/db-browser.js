module.exports = { open() { throw new Error('The browser edition opens its database in engine.js'); }, tx: require('../../../src/schema').tx };
