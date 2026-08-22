import { createContext, useContext, type ReactNode } from "react";

import { useSessao } from "../hooks/useSessao";

type Sessao = ReturnType<typeof useSessao>;

const Contexto = createContext<Sessao | null>(null);

/** Contexto de sessão -- o ÚNICO estado global de cliente do app.
 *
 * Existe porque, com o router, quem precisa dele está em ramos diferentes da
 * árvore: `entrar` na tela de login, `sair` no menu lateral (três níveis
 * abaixo) e `autenticado` na rota protegida. Passar por prop viraria
 * drilling atravessando componentes que não têm nada a ver com sessão.
 *
 * ⚠️ **Não** virar depósito de estado geral. Dado de servidor é do React
 * Query -- pôr processo, tarefa ou cliente aqui duplicaria o cache e faria
 * a invalidação parar de funcionar, que é justamente o que o React Query
 * resolve. Se aparecer a vontade de guardar "a lista de X" aqui, o lugar
 * certo é uma query.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const sessao = useSessao();
  return <Contexto.Provider value={sessao}>{children}</Contexto.Provider>;
}

/** Lança se usado fora do provider -- erro na hora, em vez de `undefined`
 * silencioso aparecendo como "deslogado" numa tela que deveria estar logada. */
export function useSessaoContexto(): Sessao {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error("useSessaoContexto precisa estar dentro de <SessaoProvider>");
  }
  return valor;
}
