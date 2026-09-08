import type { ReactNode } from "react";

/** Uma coluna que precisa dizer mais que o nome.
 *
 * 🔴 Existe por causa da coluna de DINHEIRO: os valores são alinhados à
 * direita (é o que deixa duas quantias comparáveis numa coluna), e o
 * cabeçalho ficava à esquerda, pendurado longe do número que nomeia. No
 * artefato os dois são `.direita` -- a célula E o `th`. */
export interface ColunaDaTabela {
  rotulo: string;
  aDireita?: boolean;
}

export interface TabelaProps {
  /** Uma string por coluna, na ordem -- ou um `ColunaDaTabela` quando a
   * coluna precisa de alinhamento próprio. Vazia (`""`) pra coluna de ações,
   * que no artifact é `<th></th>`: o cabeçalho existe pra a contagem de
   * colunas bater, mas não tem nome. */
  colunas: readonly (string | ColunaDaTabela)[];
  /** Renderizado NO LUGAR da tabela quando não há linha nenhuma -- um
   * `EstadoVazio`. Sem cabeçalho de colunas vazias em cima, que é o que
   * sobraria de uma tabela sem corpo. */
  vazio?: ReactNode;
  /** As `Table.Row` do corpo. */
  children: ReactNode;
}
