import { Box, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { BotaoDeTexto, Cartao, IconeSeta, Skeleton, useToast } from "../../components";
import { formatarDataHoraAmPm } from "../../utils";
import { useCatalogosDeProcesso } from "../../hooks/useCatalogosDeProcesso";
import { detalhesProcesso, removerProcesso } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import FormularioProcesso from "./components/FormularioProcesso";
import Movimentacoes from "./components/Movimentacoes";
import TarefasVinculadas from "./components/TarefasVinculadas";
import type { Comunicacao, Processo } from "../../types";

/** Página de detalhe de um processo.
 *
 * É ROTA e não modal, como no artifact -- e isso não é preferência visual:
 * o e-mail de lembrete manda link direto pra cá, então a tela precisa se
 * hidratar sozinha a partir da URL. `GET /processos/{numero}/detalhes`
 * devolve as linhas do processo justamente pra isso.
 *
 * O `subgrupoId` está no caminho porque o mesmo número pode existir em mais
 * de um subgrupo, e é por subgrupo que se edita e se remove.
 */
export default function ProcessoDetalhePage() {
  const { subgrupoId = "", numero = "" } = useParams();
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const apoio = useCatalogosDeProcesso();
  const toast = useToast();

  const query = useQuery<{ comunicacoes: Comunicacao[]; processos: Processo[] }>({
    queryKey: qk.detalhesProcesso(numero),
    queryFn: () => detalhesProcesso(numero),
  });

  const removerMutation = useMutation({
    mutationFn: () => removerProcesso(subgrupoId, numero),
    onSuccess: () => {
      // Prefixo, não a chave exata: invalida a listagem em qualquer
      // combinação de filtro e página.
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      voltar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir o processo."),
  });

  function voltar() {
    navegar("/processos");
  }

  if (query.isPending) return <Skeleton linhas={4} />;
  if (query.isError) {
    return (
      <Stack gap="14px" align="flex-start">
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta />
          Voltar
        </BotaoDeTexto>
        <Text color="fg.muted">
          {query.error instanceof Error ? query.error.message : "Não foi possível carregar."}
        </Text>
      </Stack>
    );
  }

  // O detalhe devolve uma linha por subgrupo visível; a desta rota é a que
  // se edita. Some quando o processo é removido do subgrupo por outra
  // pessoa -- aí volta pra lista em vez de mostrar formulário vazio.
  const processo = query.data.processos.find((p) => p.subgrupo_id === subgrupoId);
  if (!processo) {
    return (
      <Stack gap="14px" align="flex-start">
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta />
          Voltar
        </BotaoDeTexto>
        <Text color="fg.muted">Este processo não está mais neste subgrupo.</Text>
      </Stack>
    );
  }

  function confirmarRemocao() {
    if (window.confirm("Excluir este processo do subgrupo?")) removerMutation.mutate();
  }

  return (
    <Box>
      <Box mb="14px">
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta />
          Voltar
        </BotaoDeTexto>
      </Box>

      <FormularioProcesso
        processo={processo}
        subgrupoNome={apoio.subgrupoNome(processo.subgrupo_id)}
        faseRotulo={apoio.faseRotulo(processo.fase_id)}
        situacaoRotulo={apoio.situacaoRotulo(processo.situacao_id)}
        onSalvo={() => {
          queryClient.invalidateQueries({ queryKey: qk.detalhesProcesso(numero) });
          queryClient.invalidateQueries({ queryKey: ["processos"] });
          toast.sucesso("Processo atualizado.");
        }}
        onRemover={confirmarRemocao}
      />

      <Box mt="16px">
        <Cartao titulo="Tarefas vinculadas">
          <TarefasVinculadas numeroProcesso={numero} />
        </Cartao>
      </Box>

      <Box mt="16px">
        <Cartao
          titulo="Movimentações"
          /* Quando o robô olhou pela última vez fica no cabeçalho do
             cartão: é o que diz se o silêncio é do processo ou do sistema.
             Sem isso, uma lista curta parece desatualizada sem que dê pra
             saber. */
          acoes={
            <Text fontSize="12px" color="fg.subtle">
              {processo.ultima_verificacao
                ? `Verificado em ${formatarDataHoraAmPm(processo.ultima_verificacao)}`
                : "Ainda não verificado"}
            </Text>
          }
        >
          <Movimentacoes comunicacoes={query.data.comunicacoes} />
        </Cartao>
      </Box>
    </Box>
  );
}
