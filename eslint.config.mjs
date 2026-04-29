import cds from '@sap/cds/eslint.config.mjs'
import cdsPlugin from '@sap/eslint-plugin-cds'

export default [
  ...cds.recommended,
  cdsPlugin.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/Component-preload.js',
      '**/webapp/lib/**',
      '**/webapp/vendor/**',
      'gen/**'
    ]
  },
  {
    files: ['app/**/webapp/**/*.js'],
    languageOptions: {
      globals: {
        alert: 'readonly',
        Blob: 'readonly',
        Event: 'readonly',
        FileReader: 'readonly',
        HBox: 'readonly',
        MutationObserver: 'readonly',
        navigator: 'readonly'
      }
    },
    rules: {
      'no-empty': 'warn',
      'no-useless-assignment': 'warn'
    }
  }
]
