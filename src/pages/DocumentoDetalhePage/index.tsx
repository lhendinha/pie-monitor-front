import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BotaoDeTexto,
  CartaoDeTabela,
  EstadoDeErro,
  Esqueleto,
  IconeSeta,
  ModalDeConfirmacao,
  useToast,
} from "../../components";
import { DOCUMENTO_ARQUIVO } from "../../constants";
import { detalhesDocumento, removerDocumento } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import FormularioDocumento from "./components/FormularioDocumento";
import type { Documento } from "../../types";

/** A tela de um documento: onde ele se descreve, se baixa, se substitui e
 * se exclui.
 *
 * É ROTA, e não um modal, pelo mesmo motivo do detalhe de processo e de
 * cliente: precisa sobreviver a um F5 e a um link colado. `GET /subgrupos/
 * {sg}/documentos/{id}` existe justamente pra ela se hidratar sozinha --
 * pela listagem não daria, ela não filtra por id.
 *
 * O par (subgrupo, id) vem da URL porque é a chave primária: o documento não
 * é endereçável só pelo id.
 *
 * 🔴 **Sem abas.** Processo e cliente têm porque carregam coisas de
 * naturezas diferentes (cadastro, tarefas, movimentações). Um documento é
 * uma coisa só; dividi-lo em abas seria esconder metade de uma tela que cabe
 * inteira.
 */
export default function DocumentoDetalhePage() {
  const { subgrupoId = "", documentoId = "" } = useParams();
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const query = useQuery<Documento>({
    queryKey: qk.documento(subgrupoId, documentoId),
    queryFn: () => detalhesDocumento(subgrupoId, documentoId),
    enabled: Boolean(subgrupoId && documentoId),
    /* Link velho aponta pra documento que pode ter sido excluído. Retentar
       um 404 três vezes só atrasa o recado. */
    retry: false,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.documento(subgrupoId, documentoId) });
    // A listagem e as abas das telas de detalhe mostram título, descrição e
    // vínculo -- todos podem ter acabado de mudar.
    queryClient.invalidateQueries({ queryKey: ["documentos"] });
  }

  const excluir = useMutation({
    mutationFn: () => removerDocumento(subgrupoId, documentoId),
    onSuccess: () => {
      /* 🔴 Derruba só as LISTAS, nunca o detalhe -- correção de um defeito
       * visto em Chrome.
       *
       * `qk.documento` começa com `["documentos"]`, então invalidar o
       * prefixo cru derrubava TAMBÉM a consulta desta tela, que ainda está
       * montada neste instante: ela rebuscava o documento recém-apagado e
       * tomava `404`.
       *
       * ⚠️ `removeQueries` não resolve, e piora -- medido: tirar do cache uma
       * consulta que ainda tem observador ativo faz o observador buscar de
       * novo NA HORA, então em vez de uma revalidação vinham duas.
       *
       * O `predicate` deixa a entrada do detalhe intacta. A tela está saindo
       * de cena; não há o que revalidar nela. */
      queryClient.invalidateQueries({
        queryKey: ["documentos"],
        predicate: (q) => q.queryKey[1] !== "detalhe",
      });
      toast.sucesso("Documento excluído.");
      navegar("/documentos");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir o documento."),
  });

  const voltar = () => navegar("/documentos");

  const cabecalho = (
    <Box mb="14px">
      <BotaoDeTexto onClick={voltar}>
        <IconeSeta />
        Voltar
      </BotaoDeTexto>
    </Box>
  );

  if (query.isPending) {
    return (
      <Box>
        {cabecalho}
        <Esqueleto linhas={5} />
      </Box>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Box>
        {cabecalho}
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar este documento. Ele pode ter sido excluído."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      </Box>
    );
  }

  const documento = query.data;

  return (
    <Box>
      {cabecalho}

      {/* 🔴 O formulário só monta com o documento em mãos -- ver o comentário
          de `FormularioDocumento`. Os campos dele nascem do estado inicial,
          e montá-lo antes da resposta os deixaria vazios pra sempre. */}
      <FormularioDocumento
        documento={documento}
        onSalvo={invalidar}
        onRemover={() => setConfirmandoExclusao(true)}
      />

      {confirmandoExclusao && (
        <ModalDeConfirmacao
          titulo="Excluir documento"
          mensagem={
            <>
              O documento <strong>{documento.titulo}</strong> será removido.
            </>
          }
          /* 🔴 O aviso do arquivo é o que separa esta exclusão das outras do
             sistema: apagar uma tarefa apaga uma linha, apagar um documento
             DESTRÓI o arquivo -- e o armazenamento não tem versionamento,
             então não há de onde restaurar. */
          aviso={
            documento.tipo === DOCUMENTO_ARQUIVO
              ? "O arquivo é apagado do armazenamento e não pode ser recuperado."
              : undefined
          }
          confirmando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmandoExclusao(false)}
        />
      )}
    </Box>
  );
}
