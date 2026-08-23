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
  listarMembrosDoGrupo,
  papelAtende,
  removerAtendimento,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { coresDoStatus } from "../../theme/atendimento";
import { mascararNumeroProcesso } from "../../utils";
import LinhaDoTempo from "./components/LinhaDoTempo";
import NovoRegistro from "./components/NovoRegistro";
import type { Atendimento, Cliente, Membro } from "../../types";

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

  const clientesQuery = useQuery<{ clientes: Cliente[] }>({
    queryKey: qk.clientes({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarClientes({ tamanhoPagina: TETO_POR_PAGINA }) as Promise<{
      clientes: Cliente[];
    }>,
  });
  const nomePorCliente = useMemo(
    () => new Map((clientesQuery.data?.clientes || []).map((c) => [c.cliente_id, c.nome])),
    [clientesQuery.data],
  );

  /** Apelidos de quem escreveu. `manager` pra cima -- pra `user` a lista
   * não vem, e a linha do tempo mostra o e-mail, que ainda identifica. */
  const membrosQuery = useQuery<{ membros: Membro[] }>({
    queryKey: qk.membros(),
    queryFn: listarMembrosDoGrupo,
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
            {atendimento.cliente_ids.map((id) => (
              <EtiquetaDeMetadado key={id}>{nomePorCliente.get(id) ?? id}</EtiquetaDeMetadado>
            ))}
            {atendimento.processo_numero && (
              <EtiquetaDeMetadado>
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
          /* Diz o que se perde, e nomeia: a linha do tempo é o trabalho
             acumulado, e é ela que não volta. */
          mensagem={`"${atendimento.assunto}" e os ${(atendimento.registros || []).length} registros da linha do tempo serão apagados. Não dá pra desfazer.`}
          confirmando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmandoExclusao(false)}
        />
      )}
    </Box>
  );
}
