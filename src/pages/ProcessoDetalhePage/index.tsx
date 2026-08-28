import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  Abas,
  BotaoDeTexto,
  Cartao,
  DocumentosVinculados,
  IconeSeta,
  Esqueleto,
  ModalDeConfirmacao,
  PainelDaAba,
  useToast,
} from "../../components";
import {
  abaValida,
  contar,
  formatarDataHoraAmPm,
  mascararNumeroProcesso,
  PARAM_DA_ABA,
} from "../../utils";
import { useCatalogosDeProcesso } from "../../hooks/useCatalogosDeProcesso";
import { detalhesProcesso, removerProcesso } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useTarefasDoProcesso } from "./hooks/useTarefasDoProcesso";
import FormularioProcesso from "./components/FormularioProcesso";
import NumeroDoProcesso from "./components/NumeroDoProcesso";
import Movimentacoes from "./components/Movimentacoes";
import TarefasVinculadas from "./components/TarefasVinculadas";
import { ABAS_DO_PROCESSO, GRUPO_DE_ABAS, PARAM_DA_COMUNICACAO } from "./constants";
import type { AbaDoProcesso } from "./types";
import { useVoltarParaLista } from "../../hooks/useVoltarParaLista";
import type {
  RespostaDeDetalhesDoProcesso,
} from "../../types/respostas";

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
  const queryClient = useQueryClient();
  const apoio = useCatalogosDeProcesso();
  const toast = useToast();
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  /** A aba escolhida vive na URL (`?aba=tarefas`).
   *
   * 🔴 Diferente de `GrupoPage` e `PerfilPage`, que guardam em `useState`.
   * Esta tela é alcançada por LINK -- do e-mail de lembrete, do Kanban, da
   * Agenda --, e recarregar devolvendo a pessoa pra primeira aba incomoda
   * mais num detalhe do que numa tela de gestão. De quebra, dá pra mandar
   * "olha as movimentações deste processo" pra alguém.
   *
   * `replace` na navegação: trocar de aba não é um passo do histórico. Sem
   * isso, quem visse as três abas precisaria de três "voltar" pra sair da
   * tela. */
  const [params, setParams] = useSearchParams();

  /* ⚠️ `?comunicacao=` MANDA na aba, e não é enfeite: o modal do teor é
     filho do painel de Movimentações, e painel escondido é `display: none`
     -- com a aba em Detalhes, o modal existiria no documento e não
     apareceria na tela. É o que aconteceria com todo link de movimentação
     colado sem a aba junto.

     Sair da aba é possível porque `irParaAba` LARGA o parâmetro: ele quer
     dizer "o teor está aberto", e trocar de aba é fechá-lo. */
  const vendoComunicacao = Boolean(params.get(PARAM_DA_COMUNICACAO));
  const aba = vendoComunicacao
    ? "movimentacoes"
    : abaValida(ABAS_DO_PROCESSO, params.get(PARAM_DA_ABA));

  const irParaAba = (nova: AbaDoProcesso) => {
    const proximos = new URLSearchParams(params);
    proximos.set(PARAM_DA_ABA, nova);
    proximos.delete(PARAM_DA_COMUNICACAO);
    setParams(proximos, { replace: true });
  };

  /** Mesma consulta do cartão de tarefas -- serve pra dizer, na hora de
   * excluir, quantas tarefas ficam sem processo. */
  const tarefasQuery = useTarefasDoProcesso(numero);
  const tarefasLigadas = tarefasQuery.data?.tarefas.length ?? 0;

  const query = useQuery<RespostaDeDetalhesDoProcesso>({
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

  /* ⚠️ Volta no HISTÓRICO, não para o caminho fixo: a listagem guarda
     página, tamanho e filtros na URL, e `navegar("/processos")` os jogaria
     fora. Ver `useVoltarParaLista`. */
  const voltar = useVoltarParaLista("/processos");

  if (query.isPending) return <Esqueleto linhas={4} />;
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

  return (
    <Box>
      <Flex
        mb="14px"
        align="center"
        justify="space-between"
        gap="10px"
        wrap="wrap"
      >
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta />
          Voltar
        </BotaoDeTexto>

        {/* 🔴 Quando o robô olhou pela última vez fica FORA das abas, e não
            no cabeçalho do cartão de Movimentações como antes.
            É o que diz se o silêncio é do processo ou do sistema: um
            processo sem novidade e um que o robô não conseguiu verificar
            têm a mesma cara -- lista curta, nada novo. Dentro da aba, só
            veria quem entrasse nela; e a tela abre em "Detalhes". */}
        <Text fontSize="12px" color="fg.subtle">
          {processo.ultima_verificacao
            ? `Verificado em ${formatarDataHoraAmPm(processo.ultima_verificacao)}`
            : "Ainda não verificado"}
        </Text>
      </Flex>

      <Abas
        grupo={GRUPO_DE_ABAS}
        abas={ABAS_DO_PROCESSO.map((a) => ({ id: a.id, rotulo: a.rotulo }))}
        ativa={aba}
        onMudar={irParaAba}
      />

      {/* ⚠️ Os três painéis vão MONTADOS -- ver `PainelDaAba`. O de
          Detalhes é um formulário com estado local, e desmontá-lo ao trocar
          de aba jogaria fora o que a pessoa acabou de digitar. Não custa
          consulta: `GET /processos/{n}/detalhes` já traz as comunicações, e
          as tarefas vêm de uma query que a página assina de qualquer jeito
          (ela conta as vinculadas na hora de excluir). */}
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="detalhes" ativa={aba}>
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
          onRemover={() => setConfirmandoRemocao(true)}
        />
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="tarefas" ativa={aba}>
        <Cartao titulo="Tarefas vinculadas">
          <TarefasVinculadas numeroProcesso={numero} />
        </Cartao>
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="movimentacoes" ativa={aba}>
        <Cartao titulo="Movimentações">
          <Movimentacoes comunicacoes={query.data.comunicacoes} />
        </Cartao>
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="documentos" ativa={aba}>
        <Cartao titulo="Documentos">
          <DocumentosVinculados
            filtro={{ processoNumero: numero }}
            /* O modal de criação abre no subgrupo DO PROCESSO: é onde o
               documento vai ser procurado depois, e escolher outro
               esconderia o documento de quem estava olhando este processo. */
            subgrupoInicial={processo.subgrupo_id}
            /* Com o número MASCARADO como rótulo -- a etiqueta do vínculo é
               onde a pessoa confere que vinculou ao processo certo, e vinte
               dígitos colados não se conferem. */
            vinculoInicial={{
              tipo: "processo",
              id: numero,
              rotulo: mascararNumeroProcesso(numero),
            }}
            vazio="Nenhum documento vinculado a este processo."
          />
        </Cartao>
      </PainelDaAba>

      {confirmandoRemocao && (
        <ModalDeConfirmacao
          titulo="Excluir processo"
          mensagem={
            <>
              O processo <NumeroDoProcesso numero={numero} /> deixa de ser monitorado e sai
              deste subgrupo.
            </>
          }
          /* O aviso só aparece quando há o que avisar: "0 tarefas
             vinculadas" é ruído. As tarefas não são apagadas junto -- elas
             ficam sem processo, e isso é surpresa se ninguém disser. */
          aviso={
            tarefasLigadas
              ? `${contar(tarefasLigadas, "tarefa vinculada", "tarefas vinculadas")} a ele ${
                  tarefasLigadas === 1 ? "continua existindo, mas fica" : "continuam existindo, mas ficam"
                } sem processo.`
              : undefined
          }
          /* Trava "Excluir" enquanto a contagem de tarefas não chega. O
             aviso acima é a CONSEQUÊNCIA da exclusão -- confirmar antes
             dele seria decidir sem ver o que vai acontecer, e é rápido o
             bastante pra dar tempo disso. */
          /* ⚠️ `isPending || isError`, e não só `isPending`. Em FALHA,
             `data` é `undefined`, `tarefasLigadas` cai pra 0 e o aviso
             sobre tarefas órfãs SOME -- a pessoa confirmaria a exclusão
             achando que não há nada vinculado. Não saber quantas são é
             motivo pra não deixar excluir, não pra deixar. */
          verificando={tarefasQuery.isPending || tarefasQuery.isError}
          falhouAVerificacao={tarefasQuery.isError}
          mensagemDeEspera={
            tarefasQuery.isError
              ? "Não foi possível conferir o que está vinculado a este processo. Recarregue a página antes de excluir."
              : "Conferindo o que está vinculado a este processo…"
          }
          confirmando={removerMutation.isPending}
          onConfirmar={() => removerMutation.mutate()}
          onFechar={() => setConfirmandoRemocao(false)}
        />
      )}
    </Box>
  );
}

