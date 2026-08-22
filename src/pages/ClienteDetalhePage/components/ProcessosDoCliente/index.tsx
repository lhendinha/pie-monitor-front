import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "../../../../components";
import { useCatalogosDeProcesso } from "../../../../hooks/useCatalogosDeProcesso";
import { listarProcessos } from "../../../../services";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { mascararNumeroProcesso } from "../../../../utils";
import type { Processo } from "../../../../types";

interface Props {
  clienteId: string;
}

/** Os processos deste cliente.
 *
 * Sai de `GET /processos?cliente_id=X`, filtro que já existia -- é a mesma
 * pergunta que a coluna "Processos" da listagem responde em número, aqui
 * respondida por extenso.
 */
export default function ProcessosDoCliente({ clienteId }: Props) {
  const apoio = useCatalogosDeProcesso();
  const query = useQuery<{ processos: Processo[] }>({
    queryKey: qk.processos({ clienteId }),
    queryFn: () => listarProcessos({ clienteId }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os processos do cliente.");

  if (query.isPending) return <Skeleton linhas={2} />;

  const processos = query.data?.processos || [];
  if (processos.length === 0) {
    return (
      <Text fontSize="13px" color="fg.subtle">
        Nenhum processo vinculado a este cliente.
      </Text>
    );
  }

  return (
    <Stack gap="0">
      {processos.map((p) => (
        <Flex
          key={`${p.subgrupo_id}-${p.numero_processo}`}
          align="center"
          gap="10px"
          py="4px"
          wrap="wrap"
        >
          {/* Mesma bolinha das outras listas do sistema. */}
          <Box w="9px" h="9px" flex="0 0 auto" borderRadius="full" bg="fg.brand" aria-hidden="true" />
          <Text fontFamily="mono" fontSize="12.5px" fontWeight="700">
            {mascararNumeroProcesso(p.numero_processo)}
          </Text>
          <Text fontSize="13px" color="fg.subtle">
            {[apoio.situacaoRotulo(p.situacao_id), apoio.faseRotulo(p.fase_id)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Flex>
      ))}
    </Stack>
  );
}
