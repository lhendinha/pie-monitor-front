import type { ReactNode } from "react";

export interface TabelaProps {
  /** Uma string por coluna, na ordem. Vazia (`""`) pra coluna de ações,
   * que no artifact é `<th></th>`: o cabeçalho existe pra a contagem de
   * colunas bater, mas não tem nome.
   *
   * ⚠️ Aceita `{ nome, alinhamento }` quando a coluna não é de texto: hoje
   * só DINHEIRO usa, e é o único caso em que o alinhamento carrega
   * significado -- à direita os dígitos se alinham na vírgula e as quantias
   * se comparam de relance, que é o que uma coluna de saldo existe pra
   * permitir. Texto continua à esquerda em todas as tabelas. */
  colunas: readonly (string | { nome: string; alinhamento: "right" })[];
  /** Renderizado NO LUGAR da tabela quando não há linha nenhuma -- um
   * `EstadoVazio`. Sem cabeçalho de colunas vazias em cima, que é o que
   * sobraria de uma tabela sem corpo. */
  vazio?: ReactNode;
  /** As `Table.Row` do corpo. */
  children: ReactNode;
}
