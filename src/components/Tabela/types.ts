import type { ReactNode } from "react";

export interface TabelaProps {
  /** Uma string por coluna, na ordem. Vazia (`""`) pra coluna de ações,
   * que no artifact é `<th></th>`: o cabeçalho existe pra a contagem de
   * colunas bater, mas não tem nome. */
  colunas: readonly string[];
  /** Renderizado NO LUGAR da tabela quando não há linha nenhuma -- um
   * `EstadoVazio`. Sem cabeçalho de colunas vazias em cima, que é o que
   * sobraria de uma tabela sem corpo. */
  vazio?: ReactNode;
  /** As `Table.Row` do corpo. */
  children: ReactNode;
}
