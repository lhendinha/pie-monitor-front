import { Table } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
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

/** A tabela do sistema (`.tbl` do artifact), com o cabeçalho e a área de
 * rolagem que toda tabela precisa.
 *
 * Existe porque Processos, Clientes e Membros desenhavam a mesma faixa de
 * cabeçalho copiada -- onze propriedades cada, três vezes. Três cópias da
 * mesma medida divergem no primeiro ajuste, e foi assim que a tabela de
 * Processos ficou com um vazio de 48px enquanto a de Clientes tinha 34.
 *
 * `Table.ScrollArea` porque tabela é conteúdo largo: em tela estreita ela
 * rola dentro do próprio container em vez de empurrar a página pro lado --
 * regra que vale pra todo conteúdo largo do sistema.
 */
export default function Tabela({ colunas, vazio, children }: Props) {
  if (vazio) return <>{vazio}</>;

  return (
    <Table.ScrollArea>
      <Table.Root size="sm" width="100%">
        <Table.Header>
          <Table.Row>
            {colunas.map((coluna, i) => (
              <Table.ColumnHeader
                key={coluna || `acoes-${i}`}
                /* `.tbl th` do artifact: 11px/800 em caixa alta, com
                   divisória de 1px em `line` -- mais forte que a das linhas
                   de dados, que usam `line-soft`. */
                fontSize="11px"
                fontWeight="800"
                textTransform="uppercase"
                letterSpacing="0.04em"
                color="fg.subtle"
                textAlign="left"
                whiteSpace="nowrap"
                p="0 14px 10px"
                borderBottomWidth="1px"
                borderBottomStyle="solid"
                borderBottomColor="border"
              >
                {coluna}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>{children}</Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
