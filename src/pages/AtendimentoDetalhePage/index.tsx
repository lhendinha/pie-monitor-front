import { Box, Flex, Heading } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Abas, BotaoDeTexto, Botao, Cartao, DocumentosVinculados, EstadoDeErro, Esqueleto, Etiqueta, EtiquetaDeMetadado, IconeClientes, IconeLink, IconeSeta, ModalDeConfirmacao, IconeLixeira, PainelDaAba } from "../../components";
import { useNomeDeSubgrupo } from "../../hooks/useNomeDeSubgrupo";
import { useToast } from "../../contexts/ToastContext";
import {
  adicionarRegistro,
  atualizarAtendimento,
  detalhesAtendimento,
  removerAtendimento,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { coresDoStatus } from "../../theme/atendimento";
import { abaValida, contar, mascararNumeroProcesso, PARAM_DA_ABA } from "../../utils";
import LinhaDoTempo from "./components/LinhaDoTempo";
import NovoRegistro from "./components/NovoRegistro";
import { ABAS_DO_ATENDIMENTO, GRUPO_DE_ABAS } from "./constants";
import FormularioAtendimento from "./components/FormularioAtendimento";
import type { AbaDoAtendimento } from "./types";
import type { Atendimento } from "../../types";
import { useVoltarParaLista } from "../../hooks/useVoltarParaLista";

/** Detalhe de um atendimento: cabeçalho, linha do tempo e o campo de
 * escrever.
 *
 * O par (subgrupo, id) vem da URL porque é a chave primária -- o
 * atendimento não é endereçável só pelo id.
 *
 * 🔴 Tem abas como processo e cliente: uma tela de detalhe sem abas ao lado
 * de duas com abas faria o mesmo conteúdo ser procurado em dois lugares
 * diferentes conforme a tela.
 */
export default function AtendimentoDetalhePage() {
  const subgrupoNome = useNomeDeSubgrupo();
  const { subgrupoId = "", atendimentoId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  /* A aba vive na URL, como nas outras duas telas de detalhe -- ver
     `PARAM_DA_ABA`. Estas telas são alcançadas por LINK (do e-mail, da
     Agenda, do Kanban), e um F5 que devolve a pessoa pra primeira aba
     incomoda de verdade.

     `replace` porque trocar de aba não é um passo do histórico: sem isso,
     quem visse as duas precisaria de dois "voltar" pra sair da tela. */
  const [params, setParams] = useSearchParams();
  const aba = abaValida(ABAS_DO_ATENDIMENTO, params.get(PARAM_DA_ABA));
  const irParaAba = (nova: AbaDoAtendimento) => {
    const proximos = new URLSearchParams(params);
    proximos.set(PARAM_DA_ABA, nova);
    setParams(proximos, { replace: true });
  };

  const query = useQuery<Atendimento>({
    queryKey: qk.atendimento(subgrupoId, atendimentoId),
    queryFn: () => detalhesAtendimento(subgrupoId, atendimentoId) as Promise<Atendimento>,
    enabled: Boolean(subgrupoId && atendimentoId),
    /* Link velho aponta pra atendimento que pode ter sido excluído.
       Retentar um 404 três vezes só atrasa o recado. */
    retry: false,
  });

  /* O nome de cada cliente vem em `cliente_nomes`, DENTRO do atendimento.
     Aqui havia uma consulta ao catálogo inteiro de clientes -- numa tela que
     mostra UM atendimento. */

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.atendimento(subgrupoId, atendimentoId) });
    // A listagem mostra status e a prévia do último registro -- os dois
    // acabaram de mudar.
    queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
  }

  /** Salva a aba Detalhes: assunto, status e responsáveis, num PATCH só.
   *
   * 🔴 Substituiu `mudarStatus`, que salvava sozinho ao escolher no `Select`
   * do cabeçalho. Um PATCH por campo faria o servidor comparar e notificar
   * três vezes o que é uma edição só.
   */
  const salvarDetalhes = useMutation({
    mutationFn: (campos: { assunto: string; status: string; responsaveis: string[] }) =>
      atualizarAtendimento(subgrupoId, atendimentoId, campos),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Atendimento atualizado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar o atendimento."),
  });

  const registrar = useMutation({
    mutationFn: (texto: string) => adicionarRegistro(subgrupoId, atendimentoId, texto),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Registro adicionado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível adicionar o registro."),
  });

  const excluir = useMutation({
    mutationFn: () => removerAtendimento(subgrupoId, atendimentoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      toast.sucesso("Atendimento excluído.");
      navigate("/atendimentos");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir o atendimento."),
  });

  /* ⚠️ Volta no HISTÓRICO -- ver `useVoltarParaLista`. */
  const voltar = useVoltarParaLista("/atendimentos");

  if (query.isPending) {
    return (
      <Box>
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta /> Voltar
        </BotaoDeTexto>
        <Esqueleto linhas={6} />
      </Box>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Box>
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta /> Voltar
        </BotaoDeTexto>
        <Cartao>
          <EstadoDeErro
            mensagem="Não foi possível carregar este atendimento. Ele pode ter sido excluído."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </Cartao>
      </Box>
    );
  }

  const atendimento = query.data;

  return (
    <Box>
      <Box mb="14px">
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta /> Voltar
        </BotaoDeTexto>
      </Box>

      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px" wrap="wrap">
        <Box minW="0">
          <Heading as="h1" fontSize="23px" fontWeight="800" letterSpacing="-0.01em">
            {atendimento.assunto}
          </Heading>
          <Flex align="center" gap="8px" mt="8px" wrap="wrap">
            <Etiqueta cores={coresDoStatus(atendimento.status)}>{atendimento.status}</Etiqueta>
            {/* 🔴 O subgrupo, como no detalhe do PROCESSO -- que já fazia isto
                e era a única das três telas irmãs a fazer.

                ⚠️ SEM ícone, ao contrário dos chips de cliente e processo
                abaixo. O ícone existe lá para separar duas coisas que se
                confundem entre si; o subgrupo não se confunde com nenhuma das
                duas, e um terceiro ícone só encheria a linha. */}
            <EtiquetaDeMetadado>{subgrupoNome(atendimento.subgrupo_id)}</EtiquetaDeMetadado>
            {/* Os chips daqui levam ÍCONE, ao contrário dos do detalhe do
                processo (que no artifact são só texto): aqui eles dizem
                coisas de naturezas diferentes -- quem é o cliente e a que
                processo isto se liga --, e sem o ícone as duas pílulas
                ficam indistinguíveis à primeira vista. */}
            {atendimento.cliente_ids.map((id, i) => (
              <EtiquetaDeMetadado key={id}>
                <Box color="fg.subtle" display="flex">
                  <IconeClientes tamanho={13} />
                </Box>
                {atendimento.cliente_nomes?.[i] || id}
              </EtiquetaDeMetadado>
            ))}
            {atendimento.processo_numero && (
              <EtiquetaDeMetadado>
                <Box color="fg.subtle" display="flex">
                  <IconeLink tamanho={13} />
                </Box>
                {mascararNumeroProcesso(atendimento.processo_numero)}
              </EtiquetaDeMetadado>
            )}
          </Flex>
        </Box>

        {/* O status se edita na aba **Detalhes**, e não num `Select` aqui: status
            é campo, e campo se edita em formulário. A ETIQUETA de status fica
            no cabeçalho: ela informa, e é o que se quer ver de relance ao
            abrir. */}

        {/* 🔴 Lixeira + a palavra "Excluir", como em `FormularioProcesso` --
            que já escreve o porquê: *"só o texto não distingue a ação
            destrutiva das outras à primeira vista"*. Era um `BotaoQuadrado`
            só-ícone, e o rótulo só aparecia ao passar o mouse.

            ⚠️ Continua no CABEÇALHO, e não no rodapé do formulário como no
            processo: lá a aba Detalhes é a PRIMEIRA, aqui é a segunda --
            movê-lo pra dentro dela esconderia a ação atrás de um clique a
            mais, numa tela que abre na conversa. Mesmo visual; o lugar é o
            que cada tela pede. */}
        <Flex gap="8px" align="flex-start" flexShrink="0">
          <Botao
            variante="perigoContorno"
            onClick={() => setConfirmandoExclusao(true)}
            disabled={excluir.isPending}
          >
            <IconeLixeira />
            Excluir
          </Botao>
        </Flex>
      </Flex>

      <Abas
        grupo={GRUPO_DE_ABAS}
        abas={ABAS_DO_ATENDIMENTO.map((a) => ({ id: a.id, rotulo: a.rotulo }))}
        ativa={aba}
        onMudar={irParaAba}
      />

      {/* ⚠️ Os dois painéis vão MONTADOS -- ver `PainelDaAba`. O que obriga é
          o de Registros: `NovoRegistro` tem estado local, e desmontá-lo ao
          trocar de aba jogaria fora a anotação que a pessoa acabou de
          escrever -- num campo cujo conteúdo, depois de salvo, não se edita
          nem se apaga.

          O de Documentos vai junto porque não custa nada: a consulta dele é
          uma só, e escondê-la ou desmontá-la daria no mesmo em requisições. */}
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="registros" ativa={aba}>
        <Cartao>
          <Box p="16px 18px">
            <LinhaDoTempo
              registros={atendimento.registros || []}
            />
            <NovoRegistro
              enviando={registrar.isPending}
              onEnviar={(texto) => registrar.mutateAsync(texto)}
            />
          </Box>
        </Cartao>
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="detalhes" ativa={aba}>
        <FormularioAtendimento
          atendimento={atendimento}
          salvando={salvarDetalhes.isPending}
          onSalvar={(campos) => salvarDetalhes.mutate(campos)}
        />
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="documentos" ativa={aba}>
        <Cartao titulo="Documentos">
          <DocumentosVinculados
            filtro={{ atendimentoId }}
            /* O modal abre no subgrupo DO ATENDIMENTO: é onde o documento
               vai ser procurado depois. */
            subgrupoInicial={subgrupoId}
            /* Com o ASSUNTO como rótulo, não o id -- a etiqueta do vínculo é
               onde a pessoa confere que vinculou ao atendimento certo, e um
               id hexadecimal não se confere. */
            vinculoInicial={{
              tipo: "atendimento",
              id: atendimentoId,
              rotulo: atendimento.assunto,
            }}
            vazio="Nenhum documento vinculado a este atendimento."
          />
        </Cartao>
      </PainelDaAba>

      {confirmandoExclusao && (
        <ModalDeConfirmacao
          titulo="Excluir atendimento"
          /* Nomeia em NEGRITO, como todas as outras confirmações do sistema
             (subgrupo, coluna, opção): é o nome que a pessoa confere antes
             de apagar, e ele tem que saltar da frase. O componente aceita
             marcação exatamente por isso.

             O singular é dito por extenso ("o seu único registro"), e não
             como "1 registro": é a frase do artifact, e uma contagem de um
             soa a formulário. */
          mensagem={
            <>
              O atendimento <strong>{atendimento.assunto}</strong> e{" "}
              {(atendimento.registros || []).length === 1
                ? "o seu único registro será removido"
                : `todos os seus ${contar(
                    (atendimento.registros || []).length,
                    "registro",
                    "registros",
                  )} serão removidos`}
              .
            </>
          }
          confirmando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmandoExclusao(false)}
        />
      )}
    </Box>
  );
}
