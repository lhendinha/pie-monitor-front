import { Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { BotaoNu, Esqueleto, EtiquetasDeSubgrupo, Ponto } from "../../../../components";
import { useCatalogosDeProcesso } from "../../../../hooks/useCatalogosDeProcesso";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { mascararNumeroProcesso } from "../../../../utils";
import { useProcessosDoCliente } from "../../hooks/useProcessosDoCliente";
import ModalDoProcesso from "../ModalDoProcesso";
import type { Processo } from "../../../../types";
import type { ProcessosDoClienteProps } from "./types";

/** Os processos deste cliente.
 *
 * Sai de `GET /processos?cliente_id=X`, filtro que já existia -- é a mesma
 * pergunta que a coluna "Processos" da listagem responde em número, aqui
 * respondida por extenso.
 *
 * As linhas ABREM um resumo: uma lista de números mascarados que não leva a
 * lugar nenhum obriga a copiar o número, sair pra listagem de processos e
 * colar na busca.
 */
export default function ProcessosDoCliente({ clienteId }: ProcessosDoClienteProps) {
  const apoio = useCatalogosDeProcesso();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState<Processo | null>(null);
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
        <BotaoNu
          key={`${p.subgrupo_id}-${p.numero_processo}`}
          type="button"
          onClick={() => setAberto(p)}
          display="flex"
          alignItems="center"
          gap="10px"
          w="100%"
          py="7px"
          px="4px"
          borderRadius="sm"
          flexWrap="wrap"
          _hover={{ bg: "bg.canvas" }}
        >
          {/* Mesma bolinha das outras listas do sistema. */}
          <Ponto />
          <Text fontFamily="mono" fontSize="12.5px" fontWeight="700">
            {mascararNumeroProcesso(p.numero_processo)}
          </Text>
          {/* O apelido é o nome que alguém deu pra reconhecer o processo;
              vinte dígitos não dizem qual é qual. Sai quando não há. */}
          {p.apelido && (
            <Text fontSize="13px" flex="1" minW="0" truncate>
              {p.apelido}
            </Text>
          )}

          {/* 🔴 Logo depois do apelido -- junto do que identifica o processo.
              Um cliente pode ter processos em subgrupos diferentes, e é aqui
              que a lista os põe lado a lado.

              ⚠️ `apoio.subgrupoNome`, e não `useNomeDeSubgrupo()`: este
              componente já chama `useCatalogosDeProcesso`, que expõe a mesma
              tradução sobre o mesmo catálogo. Um hook a mais aqui seria uma
              segunda assinatura para o mesmo dado. */}
          <EtiquetasDeSubgrupo nomes={[apoio.subgrupoNome(p.subgrupo_id)]} />
          <Text fontSize="13px" color="fg.subtle">
            {[apoio.situacaoRotulo(p.situacao_id), apoio.faseRotulo(p.fase_id)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </BotaoNu>
      ))}

      {aberto && (
        <ModalDoProcesso
          processo={aberto}
          situacao={apoio.situacaoRotulo(aberto.situacao_id)}
          fase={apoio.faseRotulo(aberto.fase_id)}
          /* 🔴 O resumo NÃO tem endereço próprio, ao contrário da aba e do
             teor da movimentação -- e de propósito: a coisa que ele resume
             já tem um, que é a tela do processo. Dar URL ao resumo seria
             criar um segundo endereço pro mesmo processo. */
          onAbrirProcesso={() =>
            navegar(`/processos/${aberto.subgrupo_id}/${aberto.numero_processo}`)
          }
          onFechar={() => setAberto(null)}
        />
      )}
    </Stack>
  );
}
