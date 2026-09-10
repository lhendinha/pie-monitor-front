import type { Tarefa } from "../../../../types";

export interface LinhaDeTarefaProps {
  tarefa: Tarefa;
  concluida: boolean;
  /** Em que coluna do quadro a tarefa está ("A Fazer", "Fazendo"…).
   *
   * A Agenda não tem colunas, então esta é a única forma de saber em que pé
   * a tarefa está sem abri-la -- e é a primeira metade do `meta` do
   * artifact. */
  nomeDaColuna?: string;
  /** Assunto do atendimento vinculado, quando houver. A tarefa guarda só o
   * id, e quem resolve o nome é a página. */
  assuntoDoAtendimento?: string;
  /** Nome do subgrupo da tarefa. Resolvido pela PÁGINA, pela mesma razão do
   * assunto acima: uma consulta para a lista inteira, não uma por linha. */
  subgrupoNome: string;
  onAbrir: (tarefa: Tarefa) => void;
  /** Última da lista não desenha a divisória de baixo. */
  ultima?: boolean;

  /** O modo de seleção. Presente, a linha DEIXA de ser botão e vira o
   * próprio `<label>` da caixa.
   *
   * 🔴 Não é estilo: caixa de marcar dentro de `<button>` é conteúdo
   * interativo aninhado -- HTML inválido, e o clique fica ambíguo entre
   * abrir e marcar. Como `<label>`, a linha inteira vira alvo nativo da
   * caixa: sem JS de propagação, sem duplo disparo, e o teclado continua
   * chegando pelo input.
   *
   * ⚠️ E abrir a tarefa some enquanto o modo dura, de propósito: em modo de
   * seleção o clique escolhe, não navega. */
  selecao?: {
    marcada: boolean;
    onAlternar: (comShift: boolean) => void;
  };

  /** Esconde a etiqueta de subgrupo -- só onde a linha é ESTREITA.
   *
   * 🔴 Medido em Chrome em 10/09/2026: na coluna de 320px do cartão "Hoje" a
   * linha útil tem 250px, e o bloco da direita (etiqueta + prioridade) come
   * 131 deles. Com a caixa de marcar o título caiu de 99px para 67 e virou
   * "Protocol…" -- que não identifica tarefa nenhuma na hora de apagar.
   * Sem a etiqueta o título volta a ~130px, mais do que tinha antes.
   *
   * ⚠️ Só no cartão estreito e SÓ em seleção. Na pilha de dias a linha tem
   * 1440px e a etiqueta é o que diz de qual subgrupo é a tarefa -- ali ela
   * fica. O subgrupo também é dito na confirmação, nome por nome. */
  semEtiqueta?: boolean;
}
