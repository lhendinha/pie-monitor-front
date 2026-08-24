import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** Config enxuta, focada no que pega BUG -- não em estilo.
 *
 * O projeto não tinha linter nenhum: só o `tsc --noEmit` rodava. A auditoria
 * de 08/2026 encontrou vários defeitos que um linter teria apontado de
 * graça, e o mais caro deles foi de dependência de efeito.
 *
 * Formatação fica de fora de propósito: o código já é consistente, e regra
 * de estilo em massa só geraria ruído sobre um repositório inteiro.
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Variável não usada é quase sempre resto de refatoração -- e foi
      // assim que o `entrar()` órfão apareceu no RotaRedefinirSenha.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` explícito é decisão, não descuido -- avisa sem quebrar.
      "@typescript-eslint/no-explicit-any": "warn",
      // ⚠️ AVISO, não erro. A regra é sobre render em cascata (desempenho),
      // não sobre correção -- e o projeto usa o padrão de propósito em
      // lugares onde ele é a resposta certa: consumir um deep link uma vez
      // só, e ressincronizar o rascunho de `NomeEditavel` quando a edição
      // reabre (sem isso, texto cancelado com Escape voltava e era salvo no
      // blur). Vale ver caso a caso, não travar o build.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
);
