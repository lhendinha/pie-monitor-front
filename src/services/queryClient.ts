import { useEffect, useRef } from "react";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "./api";
import { estaAutenticado } from "./auth";
import { useToast } from "../components";
import { dispararAutenticacaoInvalida } from "./authBridge";

function ehSessaoExpirada(erro: unknown): boolean {
  if (!(erro instanceof ApiError) || erro.status !== 401) return false;

  /* 🔴 401 sozinho NÃO é sessão expirada.
   *
   * `chamar` tenta renovar antes de desistir; se a renovação não deu certo,
   * ele propaga o 401 ORIGINAL -- e aí este handler deslogava, mesmo quando
   * a falha tinha sido de rede e o refresh token seguia válido no servidor.
   * Tirar o `limparTokens()` de dentro do `chamar` não resolveu nada: o
   * caminho que desloga é este aqui.
   *
   * `renovarToken` já faz a distinção certa e é a fonte a consultar: ele
   * limpa os tokens QUANDO o servidor recusa o refresh, e não limpa quando
   * a rede caiu. Então "ainda tenho tokens" significa "a renovação falhou
   * por motivo transitório" -- e a sessão continua de pé. */
  return !estaAutenticado();
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
  /** ⚠️ Guarda a última mensagem já avisada, e não só o erro.
   *
   * As deps olham a REFERÊNCIA do erro, e cada tentativa cria um `Error`
   * novo. Em Processos, que revalida a cada 60s, isso virava um toast por
   * minuto, indefinidamente -- numa tela que já está mostrando o estado de
   * erro com "Tentar de novo". Avisar uma vez basta; quem insiste é a
   * tela, não o alarme.
   *
   * Volta a `null` quando o erro some, então uma falha NOVA depois de uma
   * recuperação avisa de novo, que é o certo. */
  const jaAvisado = useRef<string | null>(null);
  useEffect(() => {
    if (!erro || ehSessaoExpirada(erro)) {
      jaAvisado.current = null;
      return;
    }
    if (jaAvisado.current === mensagem) return;
    jaAvisado.current = mensagem;
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
