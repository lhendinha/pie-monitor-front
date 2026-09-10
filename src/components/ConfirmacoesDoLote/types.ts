import type { useAcoesEmLote } from "../../hooks/useAcoesEmLote";

export interface ConfirmacoesDoLoteProps {
  /** O retorno inteiro de `useAcoesEmLote`: é ele que guarda QUAL diálogo está
   * aberto e com quais tarefas. */
  acoes: ReturnType<typeof useAcoesEmLote>;
  subgrupoNome: (id: string) => string;
}
