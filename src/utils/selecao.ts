/** As contas puras da seleção múltipla de tarefas.
 *
 * Ficam aqui, e não no hook, porque são função de entrada e saída -- dá para
 * testá-las sem montar React, e o hook fica só com o estado. É a régua da
 * seção 3 do `CONTEXT.md`: auxiliar de transformação mora em `utils/`.
 */
import { contar } from "./plural";
import type { ChaveDeTarefa, EstadoDaCaixa, ResultadoDoLote, Tarefa } from "../types";

/** A chave de uma tarefa na seleção.
 *
 * 🔴 É o PAR, nunca só o `tarefa_id`: ele é único dentro da partição do
 * subgrupo, e duas tarefas de subgrupos diferentes podem colidir. Um
 * `Set<string>` de ids soltos apagaria a errada -- e o defeito só apareceria
 * com dois subgrupos na tela, que é o caso normal da Agenda.
 *
 * ⚠️ O separador é `:`, e não é escolha nova: `CartaoDeTarefa` já monta
 * `${subgrupo_id}:${tarefa_id}` como id do `dnd-kit`. Dois formatos para a
 * mesma chave divergiriam no primeiro ajuste.
 */
export function chaveDe(tarefa: { subgrupo_id: string; tarefa_id: string }): string {
  return `${tarefa.subgrupo_id}:${tarefa.tarefa_id}`;
}

/** As chaves que o lote manda, com o responsável que a TELA VIU.
 *
 * 🔴 `responsavel_id` vai como `null` quando está vazio, e isso é uma
 * AFIRMAÇÃO -- é ela que o servidor compara para recusar o que mudou de dono
 * entre a seleção e o clique. Omitir o campo diria "não me perguntaram".
 *
 * ⚠️ `|| null`, e não `?? null`: string VAZIA também é ausência de
 * responsável. Uma linha legada pode ter `""` gravado, e mandá-lo cru faria
 * o corpo afirmar um dono que não existe. O servidor normaliza os dois do
 * mesmo jeito -- mas a tela não pode depender disso para dizer a verdade.
 */
export function paraOLote(tarefas: Tarefa[]): ChaveDeTarefa[] {
  return tarefas.map((t) => ({
    subgrupo_id: t.subgrupo_id,
    tarefa_id: t.tarefa_id,
    responsavel_id: t.responsavel_id || null,
  }));
}

/** Quantas das selecionadas ainda prendem um processo.
 *
 * 🔴 É o número da faixa amarela da confirmação, e ele existe porque "sem
 * responsável" NÃO é sinônimo de lixo: medido em produção em 09/09/2026,
 * três das quatro órfãs apontavam para um processo vivo.
 */
export function contarVinculadas(tarefas: Tarefa[]): number {
  return tarefas.filter((t) => t.processo_numero).length;
}

/** "3 de 47 selecionadas".
 *
 * ⚠️ A concordância vem de `contar`, não de um ternário local -- duas
 * maneiras de pluralizar divergem no primeiro ajuste.
 */
export function rotuloDeSelecao(marcadas: number, total: number): string {
  return `${marcadas} de ${contar(total, "selecionada", "selecionadas")}`;
}

/** O estado da caixa do topo.
 *
 * ⚠️ `indeterminada` é o traço, não o tique. Marcar parte da lista e ver o
 * tique cheio mentiria sobre o que vai sair -- e numa ação destrutiva a
 * mentira custa caro.
 */
export function estadoDaCaixaDoTopo(marcadas: number, total: number): EstadoDaCaixa {
  if (marcadas === 0 || total === 0) return "vazia";
  return marcadas >= total ? "marcada" : "indeterminada";
}

/** As chaves entre duas âncoras, na ordem em que a lista está NA TELA.
 *
 * 🔴 É o Shift+clique, e ele é o gesto que quem vem de uma caixa de e-mail
 * tenta primeiro. Sem ele, "da terceira até a décima" são oito cliques.
 *
 * ⚠️ Funciona nos DOIS sentidos: `de` pode estar depois de `ate`. Marcar de
 * baixo para cima é tão comum quanto o contrário, e um intervalo que só
 * funciona num sentido falha em silêncio, sem erro.
 *
 * ⚠️ Âncora fora da lista devolve vazio, não a lista inteira. Acontece
 * quando a página muda entre um clique e o outro.
 */
export function chavesDoIntervalo(ordem: string[], de: string, ate: string): string[] {
  const i = ordem.indexOf(de);
  const j = ordem.indexOf(ate);
  if (i < 0 || j < 0) return [];
  return ordem.slice(Math.min(i, j), Math.max(i, j) + 1);
}

/** A frase do aviso, montada do que o servidor devolveu.
 *
 * 🔴 Ela sempre diz **quantas ficaram e por quê**. Sem isso a pessoa não sabe
 * se apagou metade -- e as duas razões são diferentes: `recusadas` mudou de
 * dono (alguém assumiu no meio do caminho), `ignoradas` já não existia.
 *
 * ⚠️ Continua sendo SUCESSO, e não erro: nada falhou. A tarefa recusada ganhou
 * dono, que é o desfecho bom.
 */
export function fraseDoResultado(r: ResultadoDoLote): string {
  const partes = [`${contar(r.removidas, "tarefa excluída", "tarefas excluídas")}.`];
  if (r.recusadas.length) {
    partes.push(
      `${contar(r.recusadas.length, "ficou", "ficaram")}: o responsável mudou enquanto você escolhia.`,
    );
  }
  if (r.ignoradas.length) {
    partes.push(`${contar(r.ignoradas.length, "já não existia", "já não existiam")}.`);
  }
  return partes.join(" ");
}
