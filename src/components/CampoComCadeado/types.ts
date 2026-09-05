import type { ReactNode } from "react";

export interface CampoComCadeadoProps {
  /** O controle travado -- um `Input` `disabled`, um `Select` `desabilitado`.
   *
   * ⚠️ Quem desabilita é QUEM CHAMA, e não este componente: ele só desenha o
   * cadeado. Um wrapper que também travasse esconderia o `disabled` do
   * controle de quem lê o JSX, e o `Input` e o `Select` travam por props
   * diferentes. */
  children: ReactNode;
  /** Largura do envelope. Precisa acompanhar a do controle: o cadeado é
   * absoluto e ancora na borda direita DESTE `Box`, não na do campo.
   *
   * 🔴 Medido em Chrome: sem ela, um `Input` de 120px dentro de uma coluna
   * larga ganhava o cadeado boiando no vazio à direita, longe do campo que
   * ele tranca. Os campos que ocupam a coluna inteira não precisam passar. */
  largura?: string;
}
