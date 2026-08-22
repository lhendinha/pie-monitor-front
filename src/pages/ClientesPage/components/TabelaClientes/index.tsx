import { Box, Stack, Table, Text } from "@chakra-ui/react";

import { Botao } from "../../../../components";
import { COLUNAS_CLIENTES } from "../../constants/clientes";
import LinhaCliente from "../LinhaCliente";
import type { Cliente } from "../../../../types";

interface Props {
  clientes: Cliente[];
  busca: string;
  onLimparBusca: () => void;
}

/** A tabela de clientes, nas 4 colunas do artifact. */
export default function TabelaClientes({ clientes, busca, onLimparBusca }: Props) {
  if (clientes.length === 0) {
    return (
      <Box py="34px" px="10px" textAlign="center">
        <Stack gap="10px" align="center">
          <Text color="fg.subtle">
            {/* Vazio por busca é diferente de vazio de verdade: sem
                distinguir, a pessoa acha que não cadastrou nada. */}
            {busca ? `Nenhum cliente para “${busca}”.` : "Nenhum cliente cadastrado ainda."}
          </Text>
          {busca && (
            <Botao variante="ghost" onClick={onLimparBusca}>
              Limpar busca
            </Botao>
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
            {COLUNAS_CLIENTES.map((coluna) => (
              <Table.ColumnHeader
                key={coluna}
                fontSize="11px"
                fontWeight="800"
                textTransform="uppercase"
                letterSpacing="0.04em"
                color="fg.subtle"
                textAlign="left"
                whiteSpace="nowrap"
                p="0 14px 10px"
                borderBottomWidth="1px"
                borderBottomColor="border"
              >
                {coluna}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {clientes.map((c) => (
            <LinhaCliente key={c.cliente_id} cliente={c} />
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
