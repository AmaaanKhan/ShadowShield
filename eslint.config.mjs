// eslint.config.mjs  –  ESLint flat config (ESLint v9+)
import js from "@eslint/js";
import globals from "globals";

export default [
    // -----------------------------------------------------------------------
    // 1. Global ignores
    // -----------------------------------------------------------------------
    {
        ignores: [
            "dist/**",
            "artifacts/**",
            "node_modules/**",
            "tests/pages/**"
        ]
    },

    // -----------------------------------------------------------------------
    // 2. Inject layer — page world (MAIN)
    //    Includes bootstrap, core/, and modules/ under src/inject/.
    //    no-console is a WARNING per AGENTS.md rule 3.
    //    __SHADOWSHIELD_DEBUG__ is a compile-time global.
    // -----------------------------------------------------------------------
    {
        files: ["src/inject/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                __SHADOWSHIELD_DEBUG__: "readonly"
            }
        },
        rules: {
            "no-unused-vars":      ["warn", { argsIgnorePattern: "^_" }],
            "no-undef":             "error",
            "no-console":           "warn",   // AGENTS.md rule 3: warn, not error
            "eqeqeq":              ["error", "always"],
            "no-implicit-globals":  "off",
            "semi":                ["error", "always"],
            "quotes":              ["error", "double", { avoidEscape: true }]
        }
    },

    // -----------------------------------------------------------------------
    // 3. Shared utilities — pure JS, no browser/node globals needed
    // -----------------------------------------------------------------------
    {
        files: ["src/shared/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {}
        },
        rules: {
            "no-unused-vars":      ["warn", { argsIgnorePattern: "^_" }],
            "no-undef":             "error",
            "no-console":           "error",  // no side-effects in shared/
            "eqeqeq":              ["error", "always"],
            "no-implicit-globals":  "off",
            "semi":                ["error", "always"],
            "quotes":              ["error", "double", { avoidEscape: true }]
        }
    },

    // -----------------------------------------------------------------------
    // 4. Content bridge (isolated world, extension context)
    // -----------------------------------------------------------------------
    {
        files: ["src/content/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                browser: "readonly",
                chrome:  "readonly"
            }
        },
        rules: {
            "no-unused-vars":      ["warn", { argsIgnorePattern: "^_" }],
            "no-undef":             "error",
            "no-console":           "off",
            "eqeqeq":              ["error", "always"],
            "no-implicit-globals":  "off",
            "semi":                ["error", "always"],
            "quotes":              ["error", "double", { avoidEscape: true }]
        }
    },

    // -----------------------------------------------------------------------
    // 5. Background service worker
    // -----------------------------------------------------------------------
    {
        files: ["src/background/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                browser: "readonly",
                chrome:  "readonly"
            }
        },
        rules: {
            "no-unused-vars":      ["warn", { argsIgnorePattern: "^_" }],
            "no-undef":             "error",
            "no-console":           "off",
            "eqeqeq":              ["error", "always"],
            "no-implicit-globals":  "off",
            "semi":                ["error", "always"],
            "quotes":              ["error", "double", { avoidEscape: true }]
        }
    },

    // -----------------------------------------------------------------------
    // 6. Popup — extension context, bundled by esbuild
    // -----------------------------------------------------------------------
    {
        files: ["src/popup/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                browser: "readonly",
                chrome:  "readonly"
            }
        },
        rules: {
            "no-unused-vars":      ["warn", { argsIgnorePattern: "^_" }],
            "no-undef":             "error",
            "no-console":           "off",
            "eqeqeq":              ["error", "always"],
            "no-implicit-globals":  "off",
            "semi":                ["error", "always"],
            "quotes":              ["error", "double", { avoidEscape: true }]
        }
    },

    // -----------------------------------------------------------------------
    // 7. Tracker and ad blocking — background and popup parts, bundled by esbuild
    // -----------------------------------------------------------------------
    {
        files: ["src/blocking/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                browser: "readonly",
                chrome:  "readonly"
            }
        },
        rules: {
            "no-unused-vars":      ["warn", { argsIgnorePattern: "^_" }],
            "no-undef":             "error",
            "no-console":           "off",
            "eqeqeq":              ["error", "always"],
            "no-implicit-globals":  "off",
            "semi":                ["error", "always"],
            "quotes":              ["error", "double", { avoidEscape: true }]
        }
    },

    // -----------------------------------------------------------------------
    // 8. Build scripts (Node ESM)
    // -----------------------------------------------------------------------
    {
        files: ["scripts/**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: globals.node
        },
        rules: {
            "no-console": "off"
        }
    }
];
