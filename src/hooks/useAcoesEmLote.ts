/** A costura completa das ações em lote: seleção, confirmações, mutações,
 * avisos e o Desfazer.
 *
 * 🔴 Um lugar só para as TRÊS telas. A Área de trabalho, a Agenda e o Kanban
 * dividem tudo o que muda junto: o estado da seleção, os dois modais, as
 * quatro mutações e as frases.
 *
 * ⚠️ **Ação reversível NÃO sai do modo de seleção.** Distribuir é multi-passo
 * por natureza -- um punhado para a Marina, outro para o Rafael. Sair a cada
 * escolha obrigaria a refazer a seleção do zero. Tira do conjunto só o que JÁ
 * foi tocado. **Só excluir sai**, porque não há o que continuar.
 *
 * ⚠️ **O Desfazer é a chamada INVERSA, com a mesma guarda** -- não um endpoint
 * novo. Volta só o que o lote de fato tocou (`tocadas`), agrupado pela origem
 * (`agruparPorOrigem`), porque as rotas aceitam um destino por chamada. Excluir
 * não ganha: a tarefa voltaria com outro id, e o link do sino seguiria morto.
 *
 * ⚠️ Ele NÃO monta a barra: cada tela sabe o que a caixa do topo alcança (a
 * página, num card paginado; o período inteiro, na Agenda).
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fases 4 e 8.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { useToast } from "../contexts/ToastContext";
import { alterarStatusEmLote, atribuirTarefasEmLote } from "../services";
import { toastErroMutation } from "../services/queryClient";
import { qk } from "../services/queryKeys";
import {
  FRASE_DESFEITO,
  agruparPorOrigem,
  chaveDe,
  fraseDaAtribuicao,
  fraseDaConclusao,
  fraseDoResultado,
  fraseDoStatus,
  paraOLote,
  tocadas,
} from "../utils/selecao";
import { useAlterarStatusEmLote } from "./useAlterarStatusEmLote";
import { useAtribuirTarefasEmLote } from "./useAtribuirTarefasEmLote";
import { useConcluirTarefasEmLote } from "./useConcluirTarefasEmLote";
import { useExcluirTarefasEmLote } from "./useExcluirTarefasEmLote";
import { useSelecaoDeTarefas } from "./useSelecaoDeTarefas";
import type { ColunaDoQuadro, Tarefa } from "../types";

export function useAcoesEmLote() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const selecao = useSelecaoDeTarefas();
  /** As que estão na confirmação de EXCLUIR. `null` = nenhum modal. */
  const [confirmando, setConfirmando] = useState<Tarefa[] | null>(null);
  /** As que estão na confirmação de CONCLUIR. `null` = nenhum modal. */
  const [confirmandoConclusao, setConfirmandoConclusao] = useState<Tarefa[] | null>(null);
  /** O nome do destino da ação em curso -- a coluna, ou a pessoa --, para a
   * frase. Ref, e não estado: é lido no retorno da mutação, não desenhado. */
  const nomeDoDestino = useRef<string | null>(null);

  function recarregar() {
    queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    queryClient.invalidateQueries({ queryKey: qk.resumo() });
  }

  /** Roda a chamada inversa, grupo a grupo, e diz como terminou. */
  async function desfazer(passos: Array<() => Promise<unknown>>) {
    try {
      for (const passo of passos) await passo();
      toast.sucesso(FRASE_DESFEITO);
    } catch (err) {
      toastErroMutation(toast, err, "Não foi possível desfazer.");
    } finally {
      recarregar();
    }
  }

  /** Devolve cada tarefa à coluna de onde saiu -- o inverso de concluir e de
   * mudar o status. A guarda vai com o responsável que a tela viu, que essas
   * duas ações não mudam. */
  function voltarColunas(feitas: Tarefa[]) {
    const grupos = agruparPorOrigem(feitas, (t) => `${t.subgrupo_id}|${t.coluna_id}`);
    return [...grupos.values()].map((grupo) => () => alterarStatusEmLote(paraOLote(grupo), grupo[0].coluna_id));
  }

  const excluir = useExcluirTarefasEmLote(
    (resultado) => {
      selecao.sair();
      setConfirmando(null);
      /* 🔴 A frase sempre diz quantas ficaram e por quê. E continua sendo
         SUCESSO: a recusada ganhou dono, que é o desfecho bom. */
      toast.sucesso(fraseDoResultado(resultado));
    },
    (err) => {
      /* ⚠️ Fecha o modal antes de avisar. Deixá-lo aberto sobre um erro faria
         a pessoa clicar de novo achando que o botão falhou. */
      setConfirmando(null);
      toastErroMutation(toast, err, "Não foi possível excluir.");
    },
  );

  const conclusao = useConcluirTarefasEmLote(
    (resultado, tarefas) => {
      setConfirmandoConclusao(null);
      const feitas = tocadas(tarefas, [...resultado.ignoradas, ...resultado.recusadas]);
      selecao.esquecer(feitas.map(chaveDe));
      toast.sucesso(
        fraseDaConclusao(resultado),
        feitas.length ? { onDesfazer: () => desfazer(voltarColunas(feitas)) } : undefined,
      );
    },
    (err) => {
      setConfirmandoConclusao(null);
      toastErroMutation(toast, err, "Não foi possível concluir.");
    },
  );

  const status = useAlterarStatusEmLote(
    (resultado, pedido) => {
      const feitas = tocadas(pedido.tarefas, [...resultado.ignoradas, ...resultado.recusadas]);
      selecao.esquecer(feitas.map(chaveDe));
      toast.sucesso(
        fraseDoStatus(resultado, nomeDoDestino.current ?? ""),
        feitas.length ? { onDesfazer: () => desfazer(voltarColunas(feitas)) } : undefined,
      );
    },
    (err) => toastErroMutation(toast, err, "Não foi possível alterar o status."),
  );

  const atribuicao = useAtribuirTarefasEmLote(
    (resultado, pedido) => {
      const feitas = tocadas(pedido.tarefas, [
        ...resultado.impedidas, ...resultado.ignoradas, ...resultado.recusadas,
      ]);
      selecao.esquecer(feitas.map(chaveDe));
      /* 🔴 A guarda do Desfazer é o responsável que a tela vê AGORA -- o novo.
         Cada grupo volta ao dono de onde saiu, e "" volta ao pool. */
      const agora = pedido.responsavelId ?? "";
      const passos = [...agruparPorOrigem(feitas, (t) => t.responsavel_id || "").entries()].map(
        ([origem, grupo]) => () =>
          atribuirTarefasEmLote(paraOLote(grupo.map((t) => ({ ...t, responsavel_id: agora }))), origem || null),
      );
      toast.sucesso(
        fraseDaAtribuicao(resultado, nomeDoDestino.current),
        feitas.length ? { onDesfazer: () => desfazer(passos) } : undefined,
      );
    },
    (err) => toastErroMutation(toast, err, "Não foi possível atribuir."),
  );

  return {
    selecao,
    confirmando,
    setConfirmando,
    excluir,
    confirmandoConclusao,
    setConfirmandoConclusao,
    conclusao,
    /** Muda o status das marcadas para `coluna`. */
    alterarStatus: (tarefas: Tarefa[], coluna: ColunaDoQuadro) => {
      nomeDoDestino.current = coluna.nome;
      status.mutate({ tarefas, colunaId: coluna.coluna_id });
    },
    /** Passa as marcadas para `responsavelId` -- nulo devolve ao pool. */
    atribuir: (tarefas: Tarefa[], responsavelId: string | null, nome: string | null) => {
      nomeDoDestino.current = nome;
      atribuicao.mutate({ tarefas, responsavelId });
    },
    /** Alguma ação reversível a caminho: a barra trava as três. */
    agindo: conclusao.isPending || status.isPending || atribuicao.isPending,
  };
}
