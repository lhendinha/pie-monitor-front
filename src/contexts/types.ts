import type { ReactNode } from "react";

/** O que o `useToast()` entrega a quem chama.
 */
export interface ToastContextValue {
  erro: (mensagem: string) => void;
  sucesso: (mensagem: string) => void;
}

/** O que o `SessaoContext` entrega -- o retorno inteiro de `useSessao`.
 *
 * Aqui e não dentro do `SessaoContext.tsx` pela mesma regra: interface que
 * não são as props do componente sai do arquivo dele. */
export type Sessao = ReturnType<typeof import("../hooks/useSessao").useSessao>;

export interface ProvedorDeDescarteProps {
  /** O `pedirParaFechar` do `Modal` -- a função JÁ guardada, não o
   * `onFechar` cru. */
  pedirParaFechar: () => void;
  children: ReactNode;
}

export interface SessaoProviderProps {
  children: ReactNode;
}

export interface ToastProviderProps {
  children: ReactNode;
}
