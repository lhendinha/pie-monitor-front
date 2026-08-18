import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "../components";

export function criarQueryClientDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Envolve com QueryClientProvider (client novo por teste, sem retry/cache
 * entre testes) + ToastProvider (várias páginas usam useToast()). */
export function renderComProviders(ui: ReactElement, queryClient: QueryClient = criarQueryClientDeTeste()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    ),
  };
}
