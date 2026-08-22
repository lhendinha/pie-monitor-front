import { Box, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { BotaoDeTexto, Cartao, IconeSeta, Esqueleto, useToast } from "../../components";
import { detalheCliente, papelAtende, removerCliente } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
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

  function confirmarRemocao() {
    if (window.confirm(`Excluir o cliente "${query.data?.nome}"?`)) removerMutation.mutate();
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
        onRemover={confirmarRemocao}
      />

      <Box mt="16px">
        <Cartao titulo="Processos vinculados">
          <ProcessosDoCliente clienteId={clienteId} />
        </Cartao>
      </Box>
    </Box>
  );
}
