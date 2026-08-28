import { ChakraProvider } from "@chakra-ui/react";
import { MemoryRouter } from "react-router-dom";
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

/** Como `renderComProviders`, MAIS o roteador -- e uma rota inicial.
 *
 * 🔴 Existe desde que o estado das listagens passou a morar na URL: página,
 * tamanho e filtros saem de `useSearchParams`, que exige um `<Router>` acima.
 * Sem ele o teste morre com *"useLocation() may be used only in the context
 * of a Router"*, que é erro de infraestrutura e não diz nada sobre a tela.
 *
 * ⚠️ **Não dá para pôr o roteador dentro de `renderComProviders`**: medido,
 * o React Router 7 ESTOURA com dois `<Router>` aninhados ("You cannot render
 * a <Router> inside another <Router>"), e dezesseis arquivos já trazem o
 * seu, com `initialEntries` e `<Routes>` próprios.
 *
 * ⚠️ `rota` serve para montar a tela JÁ com estado -- `"/processos?pagina=2"`
 * é como se testa que a URL manda na lista.
 */
export function renderComRota(ui: ReactElement, rota = "/") {
  return renderComProviders(<MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>);
}
