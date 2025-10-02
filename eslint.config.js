// eslint.config.js
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["functions/src/**/*.ts", "src/**/*.ts"],
    ignores: ["functions/lib/", "dist/", "node_modules/"],
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
      ...typescriptEslint.configs.recommended.rules
    }
  }
];