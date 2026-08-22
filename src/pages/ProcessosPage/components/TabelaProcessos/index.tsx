import { Box, Button, Stack, Table, Text } from "@chakra-ui/react";

import { COLUNAS_PROCESSOS } from "../../constants/processos";
import LinhaProcesso from "../LinhaProcesso";
import type { Processo } from "../../../../types";

interface Props {
  processos: Processo[];
  filtroAtivo: boolean;
  onLimparFiltros: () => void;
  subgrupoNome: (id: string) => string;
  clientesNomes: (p: Processo) => string;
  faseRotulo: (id?: string | null) => string;
  situacaoRotulo: (id?: string | null) => string;
  onAbrir: (p: Processo) => void;
}

/** A tabela de processos, nas 6 colunas do artifact.
 *
 * `Table.ScrollArea` porque a tabela é larga: em tela estreita ela rola
 * dentro do próprio container, e não empurra a página inteira pro lado --
 * regra que vale pra todo conteúdo largo do sistema.
 */
export default function TabelaProcessos({
  processos,
  filtroAtivo,
  onLimparFiltros,
  subgrupoNome,
  clientesNomes,
  faseRotulo,
  situacaoRotulo,
  onAbrir,
}: Props) {
  if (processos.length === 0) {
    return (
      /* O vazio também é conteúdo do cartão (é uma linha da tabela no
         artifact), por isso não desenha moldura própria. */
      <Box py="48px" textAlign="center">
        <Stack gap="10px" align="center">
          <Text color="fg.muted">
            {/* Vazio por filtro é diferente de vazio de verdade: sem
                distinguir, a pessoa acha que não cadastrou nada. */}
            {filtroAtivo
              ? "Nenhum processo com os filtros atuais."
              : "Nenhum processo cadastrado ainda."}
          </Text>
          {filtroAtivo && (
            <Button size="sm" variant="outline" onClick={onLimparFiltros}>
              Limpar filtros
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Table.ScrollArea>
      <Table.Root size="sm" width="100%">
          <Table.Header>
            <Table.Row>
              {COLUNAS_PROCESSOS.map((coluna) => (
                <Table.ColumnHeader
                  key={coluna}
                  /* `.tbl th` do artifact: 11px/800, divisória de 1px na
                     cor `line` (mais forte que a das linhas de dados, que é
                     `line-soft`) e padding só embaixo. */
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
          <Table.Body>
            {processos.map((p) => (
              <LinhaProcesso
                key={`${p.subgrupo_id}-${p.numero_processo}`}
                processo={p}
                subgrupoNome={subgrupoNome}
                clientesNomes={clientesNomes}
                faseRotulo={faseRotulo}
                situacaoRotulo={situacaoRotulo}
                onAbrir={onAbrir}
              />
            ))}
          </Table.Body>
        </Table.Root>
    </Table.ScrollArea>
  );
}
