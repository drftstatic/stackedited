// Custom transformer for raw file imports (yml, html, md)
// Compatible with Jest 29+
module.exports = {
  process(sourceText) {
    return {
      code: `module.exports = ${JSON.stringify(sourceText)};`,
    };
  },
};
