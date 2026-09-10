import ConfirmacaoDeConclusaoEmLote from "../ConfirmacaoDeConclusaoEmLote";
import ConfirmacaoDeExclusaoEmLote from "../ConfirmacaoDeExclusaoEmLote";
import type { ConfirmacoesDoLoteProps } from "./types";

/** Os dois diálogos do lote -- excluir e concluir --, ligados ao estado de
 * `useAcoesEmLote`.
 *
 * 🔴 Um componente só para as três telas: o bloco da exclusão estava copiado
 * na Área de trabalho, na Agenda e no Kanban, e o de concluir viraria a sexta
 * cópia. Tirá-los das páginas também devolveu ao Kanban a folga que a
 * conclusão consumiria da régua de 250 linhas.
 *
 * ⚠️ Fica como irmão FIXO do conteúdo da página, como o `Modal` exige: dentro
 * de um ramo condicional, uma troca de ramo com ele aberto o remonta vazio.
 */
export default function ConfirmacoesDoLote({ acoes, subgrupoNome }: ConfirmacoesDoLoteProps) {
  const { confirmando, setConfirmando, excluir, confirmandoConclusao, setConfirmandoConclusao, conclusao } = acoes;

  return (
    <>
      {confirmando && (
        <ConfirmacaoDeExclusaoEmLote
          tarefas={confirmando}
          subgrupoNome={subgrupoNome}
          excluindo={excluir.isPending}
          onConfirmar={() => excluir.mutate(confirmando)}
          onFechar={() => setConfirmando(null)}
        />
      )}
      {confirmandoConclusao && (
        <ConfirmacaoDeConclusaoEmLote
          tarefas={confirmandoConclusao}
          subgrupoNome={subgrupoNome}
          concluindo={conclusao.isPending}
          onConfirmar={() => conclusao.mutate(confirmandoConclusao)}
          onFechar={() => setConfirmandoConclusao(null)}
        />
      )}
    </>
  );
}
