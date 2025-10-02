// functions/eslint.config.js
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["lib/"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module"
    },
    plugins: {
      "@typescript-eslint": typescriptEslint
    },
    rules: {
      "indent": ["error", 2],
      "object-curly-spacing": ["error", "never"],
      "eol-last": ["error", "always"],
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-expressions": ["error", { "allowShortCircuit": true, "allowTernary": true }],
      ...typescriptEslint.configs.recommended.rules
    }
  }
];