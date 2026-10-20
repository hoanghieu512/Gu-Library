import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // android/: Capacitor copies its native-bridge.js into the Gradle build output; not our code.
  globalIgnores(['dist', 'android']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // A warning, not an error: the 9 places reset a form when a modal opens, clear the old
      // document while the next one loads, or load a listing on entering a folder. Each costs one
      // extra render and none is wrong; rewriting them would touch 9 screens for no visible gain
      // (lint cleanup, 1.42.1). New code should still avoid the pattern.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // App code reaches the SAF plugin through src/plugins/saf.ts, which turns KHO_HIDDEN into
    // KhoUnreadableError for every call; importing SafNative skips that (review of 20/10). Tests
    // fake SafNative on purpose, and types are harmless.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/plugins/**', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/safNative'],
          allowTypeImports: true,
          message: "Import Saf from 'plugins/saf' instead: it turns KHO_HIDDEN into KhoUnreadableError.",
        }],
      }],
    },
  },
])
