import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/next-env.d.ts"] },
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**"],
    extends: [...nextVitals, ...nextTs],
    settings: { next: { rootDir: "apps/web" } },
  },
);
