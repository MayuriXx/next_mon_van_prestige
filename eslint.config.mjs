import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

/**
 * ESLint flat config.
 *
 * This file previously wrapped the Next.js presets in `FlatCompat.extends()`.
 * That worked when eslint-config-next shipped legacy eslintrc configs, but
 * since v16 it exports native flat config arrays whose `plugins` field is an
 * object rather than an array of strings. Feeding those through FlatCompat made
 * ESLint reject them as invalid eslintrc, and while formatting that validation
 * error it called JSON.stringify on a config graph containing circular
 * references (eslint-plugin-react), crashing with:
 *
 *   TypeError: Converting circular structure to JSON
 *
 * The crash masked the real message, so `npm run lint` failed with a stack
 * trace that said nothing about the actual cause. The presets are now imported
 * directly as the flat configs they already are.
 */
const eslintConfig = [
  // Build output and dependencies must never be linted.
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'functions/lib/**',
      'functions/node_modules/**',
      'next-env.d.ts',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  // Must stay last so it can switch off stylistic rules that would otherwise
  // fight Prettier.
  prettier,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      /*
       * eslint-plugin-react-hooks v6 (shipped with Next 16) adds React
       * Compiler oriented rules. They are downgraded to warnings rather than
       * disabled, so they stay visible without failing the build:
       *
       * - set-state-in-effect: flags SplashScreen and Navbar. SplashScreen
       *   *must* read sessionStorage after mount, because it does not exist
       *   during static export and reading it while rendering would break
       *   hydration. Navbar closing its menu on route change is a standard
       *   pattern.
       *
       * - immutability: flags `window.location.href = ...` in Navbar as
       *   "cannot be modified". That is a browser navigation API, not a
       *   mutation of application state — a false positive here.
       *
       * Revisit if/when the app adopts the React Compiler.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },

  /*
   * scripts/ are one-off Node CLI utilities (Firestore seeding, tariff
   * verification). Their entire purpose is to print to stdout.
   */
  {
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]

export default eslintConfig
