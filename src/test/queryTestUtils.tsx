import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "../components";
import { system } from "../theme";

export function criarQueryClientDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Envolve com os mesmos providers do `App` real:
 *
 * - `ChakraProvider` -- **obrigatório** desde a Fase 2. Qualquer componente
 *   do Chakra que renderize sem ele estoura
 *   `useContext returned undefined`, e o teste falha por infraestrutura, não
 *   pelo que ele queria verificar.
 * - `QueryClientProvider` com client novo por teste (sem retry nem cache
 *   vazando entre testes).
 * - `ToastProvider` -- várias páginas usam `useToast()`.
 *
 * A ordem espelha a do `main.tsx`/`App.tsx` de propósito: teste que monta
 * providers numa ordem diferente da real esconde bug de ordem. */
export function renderComProviders(ui: ReactElement, queryClient: QueryClient = criarQueryClientDeTeste()) {
  return {
    queryClient,
    ...render(
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{ui}</ToastProvider>
        </QueryClientProvider>
      </ChakraProvider>
    ),
  };
}
