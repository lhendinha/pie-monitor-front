import { Box, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { Abas, BotaoDeTexto, Cartao, DocumentosVinculados, IconeSeta, Esqueleto, ModalDeAviso, ModalDeConfirmacao, PainelDaAba } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import { detalheCliente, papelAtende, removerCliente } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { abaValida, contar, PARAM_DA_ABA } from "../../utils";
import { useProcessosDoCliente } from "./hooks/useProcessosDoCliente";
import FormularioCliente from "./components/FormularioCliente";
import ProcessosDoCliente from "./components/ProcessosDoCliente";
import { ABAS_DO_CLIENTE, GRUPO_DE_ABAS } from "./constants";
import type { AbaDoCliente } from "./types";
import type { Cliente } from "../../types";
import { useVoltarParaLista } from "../../hooks/useVoltarParaLista";

/** Página de detalhe de um cliente.
 *
 * É rota pelo mesmo motivo do detalhe de processo: precisa sobreviver a um
 * F5 e a um link colado. O `GET /clientes/{id}` existe justamente pra isso
 * -- antes só existia o cliente que a listagem já tinha em mãos.
 */
export default function ClienteDetalhePage() {
  const { clienteId = "" } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  /* Dois papéis diferentes, e é assim no backend: `PATCH /clientes` é
     `manager`, `DELETE` é `admin`. Um só booleano aqui deixaria um dos dois
     mais frouxo ou mais rígido que a API. */
  const podeEditar = papelAtende("manager");
  const podeExcluir = papelAtende("admin");
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  /* A aba vive na URL, como no detalhe do processo -- ver `PARAM_DA_ABA`.
     `replace` porque trocar de aba não é um passo do histórico: sem isso,
     quem visse as duas precisaria de dois "voltar" pra sair da tela. */
  const [params, setParams] = useSearchParams();
  const aba = abaValida(ABAS_DO_CLIENTE, params.get(PARAM_DA_ABA));
  const irParaAba = (nova: AbaDoCliente) => {
    const proximos = new URLSearchParams(params);
    proximos.set(PARAM_DA_ABA, nova);
    setParams(proximos, { replace: true });
  };

  /** Mesma consulta do cartão de processos -- serve pra dizer, na hora de
   * excluir, quantos processos perdem este cliente. */
  const processosQuery = useProcessosDoCliente(clienteId);
  const processosLigados = processosQuery.data?.length ?? 0;

  const query = useQuery<Cliente>({
    queryKey: qk.detalheCliente(clienteId),
    queryFn: () => detalheCliente(clienteId),
  });

  /* ⚠️ Volta no HISTÓRICO -- ver `useVoltarParaLista`. */
  const voltar = useVoltarParaLista("/clientes");

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

      <Abas
        grupo={GRUPO_DE_ABAS}
        abas={ABAS_DO_CLIENTE.map((a) => ({ id: a.id, rotulo: a.rotulo }))}
        ativa={aba}
        onMudar={irParaAba}
      />

      {/* ⚠️ Os dois painéis vão MONTADOS -- ver `PainelDaAba`. O que obriga
          é o de Detalhes: é um formulário com estado local (nome, CPF,
          telefone), e desmontá-lo ao trocar de aba jogaria fora o que a
          pessoa acabou de digitar.

          O de processos vai junto porque não custa nada: a consulta dele
          já está montada AQUI (`processosQuery`, que o diálogo de exclusão
          usa) e as duas dividem a chave -- esconder ou desmontar daria na
          mesma em requisições. */}
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="detalhes" ativa={aba}>
        <FormularioCliente
          cliente={query.data}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
          onSalvo={() => {
            queryClient.invalidateQueries({ queryKey: qk.detalheCliente(clienteId) });
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            /* 🔴 Processos e atendimentos também, e o motivo é o campo
               DERIVADO: o nome do cliente que essas telas mostram não vem do
               cache de clientes -- vem de `cliente_nomes`, resolvido pelo
               servidor DENTRO da resposta deles. Sem invalidar, renomear um
               cliente deixava as duas telas mostrando o nome velho até o
               polling de 60s ou uma revisita, e em conexão lenta a janela é
               maior ainda.

               Prefixo, não a chave exata: pega qualquer combinação de filtro
               e página, como no `removerProcesso`. */
            queryClient.invalidateQueries({ queryKey: ["processos"] });
            queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
            toast.sucesso("Cliente atualizado.");
          }}
          onRemover={() => {
            /* 🔴 Rebusca ANTES de decidir o que mostrar.
             *
             * A contagem vem de uma query que fica montada (o cartão de
             * processos a usa), então abrir o diálogo não disparava busca
             * nenhuma -- ele decidia com o que estivesse no cache. Contagem
             * velha e não-zero BLOQUEIA uma exclusão legítima, e o diálogo de
             * aviso nem tem botão pra insistir; contagem velha e zero manda um
             * DELETE que volta 409, o erro que toda esta pré-verificação
             * existe pra evitar.
             *
             * `useConteudoDoSubgrupo` resolve o mesmo com `gcTime: 0`, mas lá
             * a query só existe enquanto o diálogo está aberto. Aqui ela
             * sobrevive, então o gatilho tem que ser explícito. */
            processosQuery.refetch();
            setConfirmandoRemocao(true);
          }}
        />
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="processos" ativa={aba}>
        <Cartao titulo="Processos vinculados">
          <ProcessosDoCliente clienteId={clienteId} />
        </Cartao>
      </PainelDaAba>

      <PainelDaAba grupo={GRUPO_DE_ABAS} id="documentos" ativa={aba}>
        <Cartao titulo="Documentos">
          <DocumentosVinculados
            filtro={{ clienteId }}
            /* ⚠️ Sem `subgrupoInicial`: cliente é do GRUPO e não pertence a
               subgrupo nenhum, então não há qual oferecer. O modal cai no
               primeiro da lista, e a pessoa escolhe. */
            clienteInicial={{ id: clienteId, nome: query.data.nome }}
            vazio="Nenhum documento vinculado a este cliente."
          />
        </Cartao>
      </PainelDaAba>

      {/* 🔴 Exclusão BLOQUEADA usa `ModalDeAviso`, sem botão de confirmar.
          O `ModalDeConfirmacao` não tem como desabilitar o "Excluir": o
          aviso dizia "Não dá pra excluir... Desvincule antes" e o botão
          continuava ativo, então confirmar disparava um DELETE que o
          servidor recusa com 409. Prometer impossibilidade e deixar o
          caminho aberto é pior que não avisar.

          É o mesmo arranjo de `SubgruposPage`, que já separava
          "impedimento" de "confirmação" -- porta irmã que ficou aberta. */}
      {/* ⚠️ Enquanto a rebusca não termina, nenhum dos dois diálogos decide:
          o de confirmação abaixo cobre a espera com `verificando`, e o de
          bloqueio só aparece quando a contagem é fresca. */}
      {confirmandoRemocao && !processosQuery.isFetching && processosLigados > 0 && (
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

      {confirmandoRemocao && (processosQuery.isFetching || processosLigados === 0) && (
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
          /* `isFetching`, não só `isPending`: com a query montada, a rebusca
             ao abrir não passa por `isPending`, e sem isto o botão
             "Excluir" ficaria clicável em cima da contagem velha. */
          verificando={processosQuery.isFetching || processosQuery.isError}
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
