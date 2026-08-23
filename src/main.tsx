import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./services/queryClient";
import { system } from "./theme";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools }))
    )
  : () => null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ChakraProvider por fora do QueryClientProvider: os tokens precisam
        existir antes de qualquer componente renderizar, inclusive os que
        montam durante um estado de carregamento. O `system` sobe com
        `preflight: false` -- ver src/theme/index.ts. */}
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      </QueryClientProvider>
    </ChakraProvider>
  </React.StrictMode>
);
