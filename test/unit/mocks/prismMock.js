// Mock for Prism.js in Jest tests
// Provides minimal interface to prevent errors during test imports

const Prism = {
  languages: {},
  plugins: {},
  hooks: {
    all: {},
    add: () => {},
    run: () => {},
  },
  highlight: (code) => code,
  highlightAll: () => {},
  highlightElement: () => {},
  highlightAllUnder: () => {},
  tokenize: (code) => [code],
  Token: class Token {
    constructor(type, content, alias, matchedStr) {
      this.type = type;
      this.content = content;
      this.alias = alias;
      this.length = (matchedStr || '').length;
    }
  },
  util: {
    encode: (tokens) => tokens,
    type: (o) => Object.prototype.toString.call(o).slice(8, -1),
    clone: (o) => JSON.parse(JSON.stringify(o)),
  },
};

// Export as both default and named for different import styles
module.exports = Prism;
module.exports.default = Prism;
