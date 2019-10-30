const path = require('path')

module.exports = {
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['prettier', '@typescript-eslint'],
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    project: path.resolve(__dirname, './tsconfig.json'),
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'no-constant-condition': 'warn',
    semi: ['error', 'never'],
    'no-extra-semi': 0,
  },
}
