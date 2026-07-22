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

const switchCaseNewlineRule = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Require each switch case/default statement to start on its own line",
    },
    fixable: "whitespace",
    schema: [],
    messages: {
      expectedNewline:
        "Expected switch case/default body statements on their own lines.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function lineIndent(line) {
      return (sourceCode.lines[line - 1].match(/^\s*/) ?? [ "" ])[0];
    }

    return {
      SwitchCase(node) {
        const { consequent } = node;

        if (consequent.length === 0) {
          return;
        }

        const colonToken = node.test
          ? sourceCode.getTokenAfter(node.test, (token) => token.value === ":")
          : sourceCode.getTokenAfter(
            sourceCode.getFirstToken(node),
            (token) => token.value === ":",
          );

        if (!colonToken) {
          return;
        }

        const needsFirstBreak
          = consequent[0].loc.start.line === colonToken.loc.start.line;
        const sameLinePairs = [];

        for (let i = 1; i < consequent.length; i++) {
          if (consequent[i].loc.start.line === consequent[i - 1].loc.end.line) {
            sameLinePairs.push(i);
          }
        }

        if (!needsFirstBreak && sameLinePairs.length === 0) {
          return;
        }

        const caseIndent = lineIndent(node.loc.start.line);
        const broken = consequent.find(
          (statement) => statement.loc.start.line > colonToken.loc.start.line,
        );
        const bodyIndent = broken
          ? lineIndent(broken.loc.start.line)
          : `${caseIndent}  `;

        context.report({
          node: consequent[0],
          messageId: "expectedNewline",
          fix(fixer) {
            const fixes = [];

            if (needsFirstBreak) {
              fixes.push(
                fixer.replaceTextRange(
                  [ colonToken.range[1], consequent[0].range[0] ],
                  `\n${bodyIndent}`,
                ),
              );
            }

            for (const index of sameLinePairs) {
              fixes.push(
                fixer.replaceTextRange(
                  [ consequent[index - 1].range[1], consequent[index].range[0] ],
                  `\n${bodyIndent}`,
                ),
              );
            }

            return fixes;
          },
        });
      },
    };
  },
};

const sparkveyPlugin = {
  rules: {
    "iconify-jsx-extension": iconifyJsxExtensionRule,
    "switch-case-newline": switchCaseNewlineRule,
  },
};

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/node_modules/**",
      "next-env.d.ts",
      "src/next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "@stylistic": stylistic,
      sparkvey: sparkveyPlugin,
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
      "sparkvey/switch-case-newline": "error",
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
      sparkvey: sparkveyPlugin,
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
