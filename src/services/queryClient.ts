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
/** 401 que veio de uma renovação que falhou por motivo TRANSITÓRIO.
 *
 * 🔴 Terceiro caso, que a versão anterior não tinha. Depois que
 * `ehSessaoExpirada` passou a exigir "tokens sumiram", o 401 de um
 * `/refresh` que devolveu 502 durante um deploy deixou de ser suprimido --
 * e caía no `toast.erro(erro.message)`, mostrando "Autenticação inválida"
 * pra quem só pegou dez segundos de instabilidade. A sessão continua de pé,
 * então a mensagem estava errada nas duas pontas: assustava e não dizia o
 * que fazer.
 */
function ehFalhaTransitoriaDeRenovacao(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 401 && estaAutenticado();
}


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
    /* 🔴 Mesmo tratamento do lado das mutations.
     *
     * `toastErroMutation` ganhou o ramo do 401 transitório e este hook não
     * -- então um 502 no `POST /refresh` fazia a LEITURA dizer "Não foi
     * possível carregar os processos" enquanto a ESCRITA, na mesma tela,
     * dizia "Não foi possível confirmar sua sessão agora". Duas explicações
     * pro mesmo evento, e a da leitura culpando o recurso errado. */
    const texto = ehFalhaTransitoriaDeRenovacao(erro)
      ? "Não foi possível confirmar sua sessão agora. Tente de novo em instantes."
      : mensagem;
    if (jaAvisado.current === texto) return;
    jaAvisado.current = texto;
    toast.erro(texto);
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
  // Sessão morta: o banner de sessão expirada já cobre, toast duplicaria.
  if (ehSessaoExpirada(erro)) return;
  if (ehFalhaTransitoriaDeRenovacao(erro)) {
    toast.erro("Não foi possível confirmar sua sessão agora. Tente de novo em instantes.");
    return;
  }
  toast.erro(erro instanceof ApiError ? erro.message : mensagemPadrao);
}
