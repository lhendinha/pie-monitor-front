import { Box, Flex, Heading } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BotaoDeTexto,
  BotaoQuadrado,
  Cartao,
  EstadoDeErro,
  Esqueleto,
  Etiqueta,
  EtiquetaDeMetadado,
  IconeClientes,
  IconeLink,
  IconeLixeira,
  IconeSeta,
  ModalDeConfirmacao,
  Select,
  useToast,
} from "../../components";
import { STATUS_DE_ATENDIMENTO, TETO_POR_PAGINA } from "../../constants";
import {
  adicionarRegistro,
  atualizarAtendimento,
  detalhesAtendimento,
  listarClientes,
  listarTodosOsMembrosDoGrupo,
  papelAtende,
  removerAtendimento,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { coresDoStatus } from "../../theme/atendimento";
import { contar, mascararNumeroProcesso } from "../../utils";
import LinhaDoTempo from "./components/LinhaDoTempo";
import NovoRegistro from "./components/NovoRegistro";
import type { Atendimento } from "../../types";
import type {
  RespostaDeClientes,
  RespostaDeMembros,
} from "../../types/respostas";

/** Detalhe de um atendimento: cabeçalho, linha do tempo e o campo de
 * escrever.
 *
 * O par (subgrupo, id) vem da URL porque é a chave primária -- o
 * atendimento não é endereçável só pelo id.
 */
export default function AtendimentoDetalhePage() {
  const { subgrupoId = "", atendimentoId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const query = useQuery<Atendimento>({
    queryKey: qk.atendimento(subgrupoId, atendimentoId),
    queryFn: () => detalhesAtendimento(subgrupoId, atendimentoId) as Promise<Atendimento>,
    enabled: Boolean(subgrupoId && atendimentoId),
    /* Link velho aponta pra atendimento que pode ter sido excluído.
       Retentar um 404 três vezes só atrasa o recado. */
    retry: false,
  });

  const clientesQuery = useQuery<RespostaDeClientes>({
    queryKey: qk.clientes({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarClientes({ tamanhoPagina: TETO_POR_PAGINA }) as Promise<RespostaDeClientes>,
  });
  const nomePorCliente = useMemo(
    () => new Map((clientesQuery.data?.clientes || []).map((c) => [c.cliente_id, c.nome])),
    [clientesQuery.data],
  );

  /** Apelidos de quem escreveu. `manager` pra cima -- pra `user` a lista
   * não vem, e a linha do tempo mostra o e-mail, que ainda identifica. */
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.todosOsMembros(),
    queryFn: listarTodosOsMembrosDoGrupo,
    enabled: papelAtende("manager"),
  });
  const apelidoPorEmail = useMemo(
    () =>
      new Map((membrosQuery.data?.membros || []).map((m) => [m.email, m.apelido || m.email])),
    [membrosQuery.data],
  );

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.atendimento(subgrupoId, atendimentoId) });
    // A listagem mostra status e a prévia do último registro -- os dois
    // acabaram de mudar.
    queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
  }

  const mudarStatus = useMutation({
    mutationFn: (status: string) => atualizarAtendimento(subgrupoId, atendimentoId, { status }),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Status atualizado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível atualizar o status."),
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

  const voltar = () => navigate("/atendimentos");

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
            {/* Os chips daqui levam ÍCONE, ao contrário dos do detalhe do
                processo (que no artifact são só texto): aqui eles dizem
                coisas de naturezas diferentes -- quem é o cliente e a que
                processo isto se liga --, e sem o ícone as duas pílulas
                ficam indistinguíveis à primeira vista. */}
            {atendimento.cliente_ids.map((id) => (
              <EtiquetaDeMetadado key={id}>
                <Box color="fg.subtle" display="flex">
                  <IconeClientes tamanho={13} />
                </Box>
                {nomePorCliente.get(id) ?? id}
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

        <Flex gap="8px" align="flex-start" flexShrink="0">
          <Box w="170px">
            <Select
              id="status-do-atendimento"
              opcoes={STATUS_DE_ATENDIMENTO.map((nome) => ({ value: nome, label: nome }))}
              valor={atendimento.status}
              onMudar={(novo) => {
                // Escolher o que já está posto só gera requisição à toa.
                if (novo && novo !== atendimento.status) mudarStatus.mutate(novo);
              }}
              carregando={mudarStatus.isPending}
            />
          </Box>
          <BotaoQuadrado
            type="button"
            tom="perigo"
            title="Excluir atendimento"
            aria-label="Excluir atendimento"
            onClick={() => setConfirmandoExclusao(true)}
            disabled={excluir.isPending}
          >
            <IconeLixeira />
          </BotaoQuadrado>
        </Flex>
      </Flex>

      <Cartao>
        <Box p="16px 18px">
          <LinhaDoTempo
            registros={atendimento.registros || []}
            nomeDoAutor={(email) => apelidoPorEmail.get(email) ?? email}
          />
          <NovoRegistro
            enviando={registrar.isPending}
            onEnviar={(texto) => registrar.mutateAsync(texto)}
          />
        </Box>
      </Cartao>

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
