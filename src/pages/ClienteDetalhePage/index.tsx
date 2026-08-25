import { Box, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  BotaoDeTexto,
  Cartao,
  IconeSeta,
  Esqueleto,
  ModalDeAviso,
  ModalDeConfirmacao,
  useToast,
} from "../../components";
import { detalheCliente, papelAtende, removerCliente } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { contar } from "../../utils";
import { useProcessosDoCliente } from "./hooks/useProcessosDoCliente";
import FormularioCliente from "./components/FormularioCliente";
import ProcessosDoCliente from "./components/ProcessosDoCliente";
import type { Cliente } from "../../types";

/** Página de detalhe de um cliente.
 *
 * É rota pelo mesmo motivo do detalhe de processo: precisa sobreviver a um
 * F5 e a um link colado. O `GET /clientes/{id}` existe justamente pra isso
 * -- antes só existia o cliente que a listagem já tinha em mãos.
 */
export default function ClienteDetalhePage() {
  const { clienteId = "" } = useParams();
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const podeExcluir = papelAtende("admin");
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  /** Mesma consulta do cartão de processos -- serve pra dizer, na hora de
   * excluir, quantos processos perdem este cliente. */
  const processosQuery = useProcessosDoCliente(clienteId);
  const processosLigados = processosQuery.data?.length ?? 0;

  const query = useQuery<Cliente>({
    queryKey: qk.detalheCliente(clienteId),
    queryFn: () => detalheCliente(clienteId),
  });

  function voltar() {
    navegar("/clientes");
  }

  const removerMutation = useMutation({
    mutationFn: () => removerCliente(clienteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      voltar();
    },
    // O backend recusa excluir cliente ainda vinculado a processo
    // (`ClienteEmUso`) -- a mensagem dele já explica, então não invento
    // outra por cima.
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir o cliente."),
  });

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

  return (
    <Box>
      <Box mb="14px">
        <BotaoDeTexto onClick={voltar}>
          <IconeSeta />
          Voltar
        </BotaoDeTexto>
      </Box>

      <FormularioCliente
        cliente={query.data}
        podeExcluir={podeExcluir}
        onSalvo={() => {
          queryClient.invalidateQueries({ queryKey: qk.detalheCliente(clienteId) });
          queryClient.invalidateQueries({ queryKey: ["clientes"] });
          toast.sucesso("Cliente atualizado.");
        }}
        onRemover={() => setConfirmandoRemocao(true)}
      />

      <Box mt="16px">
        <Cartao titulo="Processos vinculados">
          <ProcessosDoCliente clienteId={clienteId} />
        </Cartao>
      </Box>

      {/* 🔴 Exclusão BLOQUEADA usa `ModalDeAviso`, sem botão de confirmar.
          O `ModalDeConfirmacao` não tem como desabilitar o "Excluir": o
          aviso dizia "Não dá pra excluir... Desvincule antes" e o botão
          continuava ativo, então confirmar disparava um DELETE que o
          servidor recusa com 409. Prometer impossibilidade e deixar o
          caminho aberto é pior que não avisar.

          É o mesmo arranjo de `SubgruposPage`, que já separava
          "impedimento" de "confirmação" -- porta irmã que ficou aberta. */}
      {confirmandoRemocao && processosLigados > 0 && (
        <ModalDeAviso
          titulo="Não dá pra excluir ainda"
          mensagem={
            <>
              <strong>{query.data.nome}</strong> está vinculado a{" "}
              {contar(processosLigados, "processo", "processos")}.
            </>
          }
          detalhe="Desvincule o cliente desses processos antes de excluir."
          onFechar={() => setConfirmandoRemocao(false)}
        />
      )}

      {confirmandoRemocao && processosLigados === 0 && (
        <ModalDeConfirmacao
          titulo="Excluir cliente"
          mensagem={
            <>
              O cliente <strong>{query.data.nome}</strong> será removido.
            </>
          }
          /* O aviso é a consequência da exclusão, e confirmar antes de ele
             chegar é decidir às cegas. Em falha a contagem cai pra 0 -- e
             aí o modal de impedimento acima nem apareceria --, então a
             espera precisa cobrir os dois casos. */
          verificando={processosQuery.isPending || processosQuery.isError}
          falhouAVerificacao={processosQuery.isError}
          mensagemDeEspera={
            processosQuery.isError
              ? "Não foi possível conferir o que está vinculado a este cliente. Recarregue a página antes de excluir."
              : "Conferindo o que está vinculado a este cliente…"
          }
          confirmando={removerMutation.isPending}
          onConfirmar={() => removerMutation.mutate()}
          onFechar={() => setConfirmandoRemocao(false)}
        />
      )}
    </Box>
  );
}
