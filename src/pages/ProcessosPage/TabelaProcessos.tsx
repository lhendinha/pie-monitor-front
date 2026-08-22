import { Box, Button, Stack, Table, Text } from "@chakra-ui/react";

import { COLUNAS_PROCESSOS } from "../../constants";
import LinhaProcesso from "./LinhaProcesso";
import type { Processo } from "../../types";

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
      <Box
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="lg"
        py="48px"
        textAlign="center"
      >
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
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
      boxShadow="sm"
      px="4px"
      py="6px"
    >
      <Table.ScrollArea>
        <Table.Root size="sm" width="100%">
          <Table.Header>
            <Table.Row>
              {COLUNAS_PROCESSOS.map((coluna) => (
                <Table.ColumnHeader
                  key={coluna}
                  fontSize="11.5px"
                  fontWeight="700"
                  textTransform="uppercase"
                  letterSpacing="0.04em"
                  color="fg.subtle"
                  whiteSpace="nowrap"
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
    </Box>
  );
}
