// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@babel/eslint-parser',
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-env']
    }
  },
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:vue/recommended'
  ],
  plugins: [
    'vue'
  ],
  globals: {
    "NODE_ENV": false,
    "VERSION": false
  },
  // check if imports actually resolve
  'settings': {
    'import/resolver': {
      'node': {
        'extensions': ['.js', '.vue', '.json']
      },
      'webpack': {
        'config': 'build/webpack.base.conf.js'
      }
    }
  },
  // add your custom rules here
  'rules': {
    'no-param-reassign': [2, { 'props': false }],
    // don't require .vue extension when importing
    'import/extensions': ['error', 'always', {
      'js': 'never',
      'vue': 'never'
    }],
    // allow optionalDependencies
    'import/no-extraneous-dependencies': ['error', {
      'optionalDependencies': ['test/unit/index.js']
    }],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // Vue-specific rules (relaxed for existing code)
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    'vue/require-default-prop': 'off',
    'vue/require-prop-types': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/order-in-components': 'off',
    'vue/no-template-shadow': 'off',
    'vue/html-self-closing': 'off',
    'vue/attributes-order': 'off',
    // Relaxed rules for existing codebase patterns
    'max-len': ['warn', { code: 500, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreUrls: true }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'consistent-return': 'warn',
    'default-case-last': 'off',
    'default-case': 'off',
    'import/no-cycle': 'off',
    'import/no-import-module-exports': 'off',
    'no-promise-executor-return': 'off',
    'class-methods-use-this': 'off',
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
    'no-plusplus': 'off',
    'no-restricted-globals': 'off',
    'no-underscore-dangle': 'off',
    'implicit-arrow-linebreak': 'off',
    'no-console': 'warn',
    // Vue rules for existing patterns
    'vue/no-side-effects-in-computed-properties': 'off',
    'vue/no-arrow-functions-in-watch': 'off',
    'vue/no-use-v-if-with-v-for': 'warn',
    'vue/valid-next-tick': 'off',
    'vue/no-unused-components': 'warn'
  },
  overrides: [
    {
      files: ['server/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      settings: {
        'import/resolver': {
          'node': {
            'extensions': ['.js', '.json']
          }
        }
      }
    }
  ]
}
