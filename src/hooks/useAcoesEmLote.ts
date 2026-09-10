/** A costura completa de uma ação em lote: seleção, confirmação e mutação.
 *
 * 🔴 Um lugar só para as TRÊS telas. A primeira versão tinha as mesmas trinta
 * linhas na Área de trabalho e na Agenda -- estado da seleção, estado do
 * modal, a mutação e as duas frases de aviso -- e com o Kanban seriam três
 * cópias do que muda junto.
 *
 * ⚠️ Ele NÃO monta a barra: cada tela sabe o que a caixa do topo alcança (a
 * página, num card paginado; o período inteiro, na Agenda), e essa conta não
 * é a mesma. Aqui fica o que é igual.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 4.
 */
import { useState } from "react";

import { useToast } from "../contexts/ToastContext";
import { toastErroMutation } from "../services/queryClient";
import { fraseDoResultado } from "../utils/selecao";
import { useExcluirTarefasEmLote } from "./useExcluirTarefasEmLote";
import { useSelecaoDeTarefas } from "./useSelecaoDeTarefas";
import type { Tarefa } from "../types";

export function useAcoesEmLote() {
  const toast = useToast();
  const selecao = useSelecaoDeTarefas();
  /** As que estão na confirmação. `null` = nenhum modal aberto. */
  const [confirmando, setConfirmando] = useState<Tarefa[] | null>(null);

  const excluir = useExcluirTarefasEmLote(
    (resultado) => {
      selecao.sair();
      setConfirmando(null);
      /* 🔴 A frase sempre diz quantas ficaram e por quê -- sem isso a pessoa
         não sabe se apagou metade. E continua sendo SUCESSO: a recusada
         ganhou dono, que é o desfecho bom. */
      toast.sucesso(fraseDoResultado(resultado));
    },
    (err) => {
      /* ⚠️ Fecha o modal antes de avisar. Deixá-lo aberto sobre um erro faria
         a pessoa clicar de novo achando que o botão falhou. */
      setConfirmando(null);
      toastErroMutation(toast, err, "Não foi possível excluir.");
    },
  );

  return { selecao, confirmando, setConfirmando, excluir };
}
