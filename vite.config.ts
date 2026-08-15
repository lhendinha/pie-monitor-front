import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// React Compiler: memoiza automaticamente (equivalente a useMemo/useCallback/
// React.memo espalhados manualmente pelo código). Estável desde out/2025,
// com suporte oficial a React 17+ -- não precisa do React 19 pra funcionar,
// só do pacote react-compiler-runtime (que fornece o polyfill necessário
// pra rodar em versões anteriores à 19) e do target abaixo.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "18" }]],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Fixa o timezone dos testes -- sem isso, testes de formatação de data
    // (formatarDataHoraAmPm etc.) dão resultado diferente dependendo da
    // máquina/CI que roda. America/Sao_Paulo = o público real do app.
    env: { TZ: "America/Sao_Paulo" },
  },
});
