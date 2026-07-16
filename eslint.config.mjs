import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // react-three-fiber renders imperatively inside useFrame (outside React's
    // render cycle); the React Compiler preview lints misread that model.
    files: ["src/components/gl/**"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
