import { useEffect } from "react";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "./api";
import { useToast } from "../components";
import { dispararAutenticacaoInvalida } from "./authBridge";

function ehSessaoExpirada(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 401;
}

/** Achado 15: erro 4xx (400/403/404/409...) é determinístico -- tentar de
 * novo nunca vai resolver sozinho, só atrasa em ~7s (backoff padrão de 3
 * tentativas) mostrar o erro certo pro usuário. Erro de rede (não é
 * `ApiError`, ex. `fetch` falhando) ou 5xx podem ser transitórios, esses
 * continuam tentando de novo. */
function podeSerTransitorio(erro: unknown): boolean {
  if (!(erro instanceof ApiError)) return true;
  return erro.status >= 500;
}

function tratarErroGlobal(erro: unknown) {
  if (ehSessaoExpirada(erro)) dispararAutenticacaoInvalida();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: tratarErroGlobal }),
  mutationCache: new MutationCache({ onError: tratarErroGlobal }),
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: (failureCount, erro) => podeSerTransitorio(erro) && failureCount < 3,
    },
  },
});

/** Substitui o `onError` que não existe mais em `useQuery` no RQ v5 -- chama
 * pra cada query de leitura, com a mensagem de erro genérica daquela tela.
 * Ignora 401 (a transição de sessão expirada já é global, ver authBridge). */
export function useToastOnQueryError(erro: unknown, mensagem: string) {
  const toast = useToast();
  useEffect(() => {
    if (!erro || ehSessaoExpirada(erro)) return;
    toast.erro(mensagem);
  }, [erro, mensagem, toast]);
}

/** Equivalente ao de cima, mas pro `onError` de `useMutation` (que continua
 * existindo no RQ v5, então não precisa de useEffect) -- mesma regra: nunca
 * mostra toast genérico em cima de um 401, pra não duplicar com o banner de
 * sessão expirada. */
export function toastErroMutation(
  toast: { erro: (mensagem: string) => void },
  erro: unknown,
  mensagemPadrao: string
) {
  if (ehSessaoExpirada(erro)) return;
  toast.erro(erro instanceof ApiError ? erro.message : mensagemPadrao);
}
