import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CartaoDeTabela,
  Esqueleto,
  ModalDeAviso,
  ModalDeConfirmacao,
  Pagination,
  useToast,
} from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import {
  atualizarSubgrupo,
  listarSubgrupos,
  papelAtende,
  removerSubgrupo,
} from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import FormularioNovoSubgrupo from "./components/FormularioNovoSubgrupo";
import ListaDeSubgrupos from "./components/ListaDeSubgrupos";
import MembrosDoSubgrupo from "./components/MembrosDoSubgrupo";
import { podeExcluirSubgrupo } from "./helpers/podeExcluirSubgrupo";
import {
  impedimentosDoSubgrupo,
  useConteudoDoSubgrupo,
} from "./hooks/useConteudoDoSubgrupo";
import type { Subgrupo } from "../../types";

/** Sub-aba "Subgrupos" da tela de Grupo.
 *
 * Não tem cabeçalho próprio: o título é o da página de Grupo, e as abas
 * ficam logo acima. Repetir "Subgrupos" aqui seria dizer duas vezes.
 *
 * Criar e renomear acontecem DENTRO do cartão da lista, sem modal -- cada
 * uma é um campo só, e abrir uma janela pra isso é atrito. Excluir é a
 * exceção: é irreversível, então passa pelo diálogo de confirmação como
 * toda exclusão do sistema.
 *
 * A contagem de membros de cada linha abre quem está lá dentro. É aqui, e
 * não na aba Membros, porque a pergunta é sobre o SUBGRUPO -- lá a tabela
 * responde sobre pessoas. Cada aba com um assunto.
 */
export default function SubgruposPage() {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  /** Quem pediu pra excluir. Enquanto está aqui, a tela pergunta ao
   * servidor o que ainda tem dentro -- e só então decide se mostra o
   * "tem certeza?" ou o "não dá ainda". */
  const [pedido, setPedido] = useState<Subgrupo | null>(null);
  /** De quem se está vendo os membros. A contagem da linha é a porta. */
  const [vendoMembrosDe, setVendoMembrosDe] = useState<Subgrupo | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const podeCriar = papelAtende("manager");
  const podeEditar = papelAtende("admin");

  const query = useQuery<{ subgrupos: Subgrupo[]; total: number; total_paginas: number }>({
    queryKey: qk.subgrupos({ pagina, tamanhoPagina }),
    queryFn: () => listarSubgrupos({ pagina, tamanhoPagina }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os subgrupos.");

  const conteudoQuery = useConteudoDoSubgrupo(pedido?.subgrupo_id ?? null);
  const impedimentos = impedimentosDoSubgrupo(conteudoQuery.data);

  const subgrupos = query.data?.subgrupos || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  /** O servidor recusa excluir o ÚLTIMO subgrupo de quem não é `admin`+ --
   * a pessoa ficaria com o app inteiro vazio, porque o escopo de
   * `user`/`manager` é a participação dela.
   *
   * `total` responde isso porque a listagem já vem escopada: pra quem não é
   * admin, os subgrupos visíveis SÃO os que a pessoa participa. Sem este
   * aviso a regra apareceria como um toast de 409 escrito "é o último
   * subgrupo dessa pessoa" -- frase da tela de Membros, que aqui soa como
   * se falasse de outra pessoa. */
  const ehMeuUnicoSubgrupo = !papelAtende("admin") && total === 1;

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["subgrupos"] });
  }

  const renomearMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => atualizarSubgrupo(id, nome),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Subgrupo renomeado.");
    },
    // O servidor recusa nome repetido dentro do grupo -- a mensagem dele já
    // diz qual é o problema.
    onError: (err) => toastErroMutation(toast, err, "Não foi possível renomear."),
    onSettled: () => setRenomeandoId(null),
  });

  const removerMutation = useMutation({
    mutationFn: (s: Subgrupo) => removerSubgrupo(s.subgrupo_id),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Subgrupo excluído.");
    },
    // Chegar aqui com erro é raro: os impedimentos já foram checados antes
    // do "tem certeza?". Sobra o que só o servidor sabe -- alguém que criou
    // um processo lá dentro no meio do caminho, por exemplo.
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover."),
    onSettled: () => setPedido(null),
  });

  if (query.isPending) return <Esqueleto linhas={2} />;

  return (
    <CartaoDeTabela>
      {podeCriar && <FormularioNovoSubgrupo onCriado={invalidar} />}

      <ListaDeSubgrupos
        subgrupos={subgrupos}
        podeEditar={podeEditar}
        podeExcluir={podeExcluirSubgrupo}
        renomeandoId={renomeandoId}
        onIniciarRenome={(s) => setRenomeandoId(s.subgrupo_id)}
        onRenomear={(s, nome) => renomearMutation.mutate({ id: s.subgrupo_id, nome })}
        onCancelarRenome={() => setRenomeandoId(null)}
        onVerMembros={setVendoMembrosDe}
        onRemover={setPedido}
      />

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        tamanhoPagina={tamanhoPagina}
        onMudarPagina={setPagina}
        onMudarTamanho={(t) => {
          setTamanhoPagina(t);
          setPagina(1);
        }}
      />

      {vendoMembrosDe && (
        <MembrosDoSubgrupo subgrupo={vendoMembrosDe} onFechar={() => setVendoMembrosDe(null)} />
      )}

      {/* Enquanto a contagem não chega, nenhum diálogo: abrir o "tem
          certeza?" e trocá-lo pelo "não dá ainda" meio segundo depois é
          pior que esperar.

          Se a contagem FALHA, o "tem certeza?" abre assim mesmo: o
          pré-teste é conveniência, e quem decide de verdade é o DELETE.
          Sem esta saída, um erro na contagem deixaria a lixeira sem
          resposta nenhuma. */}
      {/* Vem ANTES da confirmação: perguntar "tem certeza?" pra uma exclusão
          que o servidor vai recusar é pedir uma decisão que não existe. */}
      {pedido && ehMeuUnicoSubgrupo && (
        <ModalDeAviso
          titulo="Não dá pra excluir ainda"
          mensagem={
            <>
              <strong>{pedido.nome}</strong> é o seu único subgrupo. Sem nenhum, você ficaria sem
              ver processos, tarefas e atendimentos.
            </>
          }
          detalhe="Crie ou entre em outro subgrupo antes de excluir este."
          onFechar={() => setPedido(null)}
        />
      )}

      {pedido && !ehMeuUnicoSubgrupo && !conteudoQuery.isPending && impedimentos.length === 0 && (
        <ModalDeConfirmacao
          titulo="Excluir subgrupo"
          mensagem={
            <>
              O subgrupo <strong>{pedido.nome}</strong> e o quadro Kanban dele serão removidos.
            </>
          }
          confirmando={removerMutation.isPending}
          onConfirmar={() => removerMutation.mutate(pedido)}
          onFechar={() => setPedido(null)}
        />
      )}

      {pedido && !ehMeuUnicoSubgrupo && conteudoQuery.isSuccess && impedimentos.length > 0 && (
        <ModalDeAviso
          titulo="Não dá pra excluir ainda"
          mensagem={
            <>
              O subgrupo <strong>{pedido.nome}</strong> ainda tem:
            </>
          }
          itens={impedimentos}
          detalhe="Mova ou exclua esses itens antes de excluir o subgrupo."
          onFechar={() => setPedido(null)}
        />
      )}
    </CartaoDeTabela>
  );
}
