import { Flex, Stack, Text } from "@chakra-ui/react";

import { Esqueleto, Ponto } from "../../../../components";
import { useCatalogosDeProcesso } from "../../../../hooks/useCatalogosDeProcesso";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { mascararNumeroProcesso } from "../../../../utils";
import { useProcessosDoCliente } from "../../hooks/useProcessosDoCliente";

interface ProcessosDoClienteProps {
  clienteId: string;
}

/** Os processos deste cliente.
 *
 * Sai de `GET /processos?cliente_id=X`, filtro que já existia -- é a mesma
 * pergunta que a coluna "Processos" da listagem responde em número, aqui
 * respondida por extenso.
 */
export default function ProcessosDoCliente({ clienteId }: ProcessosDoClienteProps) {
  const apoio = useCatalogosDeProcesso();
  const query = useProcessosDoCliente(clienteId);
  useToastOnQueryError(query.error, "Não foi possível carregar os processos do cliente.");

  if (query.isPending) return <Esqueleto linhas={2} />;

  // 🔴 Erro NÃO é lista vazia.
  //
  // Sem isto, `query.data || []` fazia o cartão AFIRMAR "Nenhum processo
  // vinculado a este cliente" pra um cliente que tem 25. O toast some em
  // 4,5s; a afirmação falsa fica na tela.
  //
  // O irmão desta mesma leva -- `TarefasVinculadas` -- já tratava assim, e
  // com o mesmo raciocínio escrito. Porta irmã que ficou aberta um arquivo
  // ao lado.
  if (query.isError) {
    return (
      <Text fontSize="13px" color="status.bad.text">
        Não foi possível carregar os processos deste cliente.
      </Text>
    );
  }

  const processos = query.data || [];
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
          <Ponto />
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
