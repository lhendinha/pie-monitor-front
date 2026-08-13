import { defineConfig } from "vite";
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
});
