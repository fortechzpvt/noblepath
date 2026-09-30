import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // A leading underscore is the standard, deliberate "discarded by
      // destructuring" convention (see lib/validation.ts's honeypot strip).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // admin/ is a separate app with its own lint config (D-36).
  { ignores: [".next/**", "node_modules/**", "untitled folder/**", "admin/**", "content/generated/**"] },
];

export default eslintConfig;
