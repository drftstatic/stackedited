const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '../../'),
  testEnvironment: 'jsdom',
  moduleFileExtensions: [
    'js',
    'json',
    'vue',
  ],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '^!raw-loader!': 'identity-obj-proxy',
    '^worker-loader!\\./templateWorker\\.js$': '<rootDir>/test/unit/mocks/templateWorkerMock',
    '^prismjs$': '<rootDir>/test/unit/mocks/prismMock.js',
    '^prismjs/(.*)$': '<rootDir>/test/unit/mocks/prismMock.js',
  },
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '@vue/vue2-jest',
    '.*\\.(yml|html|md)$': '<rootDir>/test/unit/rawFileTransformer.js',
  },
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  setupFiles: [
    '<rootDir>/test/unit/setup',
  ],
  coverageDirectory: '<rootDir>/test/unit/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!**/node_modules/**',
  ],
  globals: {
    NODE_ENV: 'production',
  },
};
