import pluginJs from "@eslint/js";
import prettier from "eslint-config-prettier";
import pluginPrettier from "eslint-plugin-prettier/recommended";

import globals from "globals";
import tsEslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default tsEslint.config(
  { ignores: ["out", "src/graphql/**/client.ts"] },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  tsEslint.configs.recommended,
  pluginPrettier,
  {
    rules: {
      "prettier/prettier": ["error"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  prettier,
);
