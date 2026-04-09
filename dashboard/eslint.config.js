// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint'
import angular from 'angular-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import unusedImports from 'eslint-plugin-unused-imports';
import eslintConfigPrettier from "eslint-config-prettier/flat";

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    plugins: {
      // @ts-ignore
      'unused-imports': unusedImports,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      eslintPluginPrettierRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      'unused-imports/no-unused-imports': 'error',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
  eslintConfigPrettier,
);
