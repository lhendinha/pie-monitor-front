import { createContext, useContext, type ReactNode } from "react";

const Contexto = createContext<(() => void) | null>(null);

interface ProvedorDeDescarteProps {
  /** O `pedirParaFechar` do `Modal` -- a função JÁ guardada, não o
   * `onFechar` cru. */
  pedirParaFechar: () => void;
  children: ReactNode;
}

/** Publica, para dentro do modal, o pedido de fechar que passa pela guarda.
 *
 * 🔴 **Existe por causa do "Cancelar", que mora no rodapé do CHAMADOR.** O
 * `Modal` cobre sozinho os três gestos que ele desenha -- Escape, cortina e X
 * --, mas o rodapé é um `ReactNode` arbitrário que ele apenas renderiza: não
 * há como reescrever o `onClick` de dentro dele.
 *
 * O que existe é a posição na árvore. O `{rodape}` é renderizado DENTRO do
 * `Modal`, então um contexto o alcança -- e `BotaoDeCancelar` passa a ligar-se
 * sozinho, sem o chamador precisar lembrar de nada.
 *
 * ⚠️ **O que isto NÃO cobre**: nada impede alguém de escrever um `Botao` cru
 * com `onFechar` no rodapé. O raio disso é UM dos quatro caminhos -- Escape,
 * cortina e X continuam guardados pela prop obrigatória `descarte`.
 */
export function ProvedorDeDescarte({ pedirParaFechar, children }: ProvedorDeDescarteProps) {
  return <Contexto.Provider value={pedirParaFechar}>{children}</Contexto.Provider>;
}

/** Lança se usado fora de um `Modal`. Erro na hora, em vez de um botão que
 * não faz nada e ninguém entende por quê. */
export function usePedirParaFechar(): () => void {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error("BotaoDeCancelar precisa estar dentro de um <Modal>");
  }
  return valor;
}
