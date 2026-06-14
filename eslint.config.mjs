import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import stylistic from "@stylistic/eslint-plugin";
import packageJson from "eslint-plugin-package-json";
import * as jsoncParser from "jsonc-eslint-parser";

const iconifyJsxExtensionRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Require .jsx extension on ~icons imports",
    },
    schema: [],
    messages: {
      missingJsxExtension:
        "Icon imports from ~icons must use a .jsx extension (e.g. '~icons/mdi/account.jsx').",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        if (
          typeof source === "string"
          && source.startsWith("~icons/")
          && !source.endsWith(".jsx")
        ) {
          context.report({
            node: node.source,
            messageId: "missingJsxExtension",
          });
        }
      },
    };
  },
};

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/semi": [ "error", "always" ],
      "@stylistic/brace-style": [ "error", "1tbs", { allowSingleLine: true } ],
      "@stylistic/comma-spacing": [ "error", { before: false, after: true } ],
      "@stylistic/object-curly-spacing": [ "error", "always" ],
      "@stylistic/array-bracket-spacing": [ "error", "always" ],
      "@stylistic/keyword-spacing": [ "error", { before: true, after: true } ],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/no-multiple-empty-lines": [ "error", { max: 1, maxBOF: 0, maxEOF: 0 } ],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/max-statements-per-line": [ "error", { max: 1 } ],
      "@stylistic/lines-around-comment": [
        "error",
        {
          beforeLineComment: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
        },
      ],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        {
          blankLine: "always",
          prev: "import",
          next: [
            "const", "let", "var", "export", "function", "class",
            "expression", "if", "try", "throw", "return",
          ],
        },
        {
          blankLine: "always",
          prev: [ "import", "const", "let", "var", "expression", "block-like" ],
          next: [ "export", "function", "class" ],
        },
      ],
    },
  },
  {
    files: [ "**/*.{ts,tsx}" ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      sparkvey: {
        rules: {
          "iconify-jsx-extension": iconifyJsxExtensionRule,
        },
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "sparkvey/iconify-jsx-extension": "error",
    },
  },
  {
    files: [ "**/package.json" ],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      "package-json": packageJson,
    },
    rules: {
      "package-json/restrict-dependency-ranges": [
        "error",
        {
          rangeType: "pin",
          forDependencyTypes: [
            "dependencies",
            "devDependencies",
            "optionalDependencies",
            "peerDependencies",
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
