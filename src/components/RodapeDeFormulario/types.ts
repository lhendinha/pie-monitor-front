import type { ReactNode } from "react";

export interface RodapeDeFormularioProps {
  /** Uma gravação está em voo? Trava os DOIS botões -- é a razão de este
   * componente existir. */
  salvando?: boolean;
  /** Uma ação que fica ANTES do Cancelar, encostada à esquerda -- hoje só o
   * "Excluir" do `ModalDeTarefa`.
   *
   * ⚠️ Existe porque a ordem importa: sem um lugar próprio, ela cairia depois
   * do Cancelar. E o `disabled` dela continua com o chamador, que é quem sabe
   * o que a trava (ali, a mutation de remover). */
  acaoAEsquerda?: ReactNode;
  /** O botão de enviar, do jeito que cada formulário precisa dele. */
  children: ReactNode;
}
