/** As contas puras da seleção múltipla de tarefas.
 *
 * Ficam aqui, e não no hook, porque são função de entrada e saída -- dá para
 * testá-las sem montar React, e o hook fica só com o estado. É a régua da
 * seção 3 do `CONTEXT.md`: auxiliar de transformação mora em `utils/`.
 */
import { TETO_POR_PAGINA } from "../constants";
import { contar } from "./plural";
import type {
  ChaveDeTarefa,
  EstadoDaCaixa,
  ResultadoDoLote,
  Tarefa,
  ResultadoDaAtribuicao,
  ResultadoDaConclusao,
  ResultadoDoStatus,
  TarefaNaoTocada,
} from "../types";

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

/** Chama `pedir` em fatias de até `TETO_POR_PAGINA` e soma as respostas.
 *
 * 🔴 O servidor recusa lote acima de 100 (`MAXIMO_DE_TAREFAS_NO_LOTE`), e
 * "selecionar todas as N" pode passar disso. As fatias vão EM SÉRIE: uma falha
 * no meio para as seguintes e propaga, e o que já foi fica feito -- o mesmo
 * resultado parcial que o servidor já devolve dentro de uma fatia.
 *
 * ⚠️ Soma campo a campo: número soma, lista concatena. É o formato dos quatro
 * resultados do lote, e uma função por ação repetiria o mesmo laço quatro
 * vezes.
 */
export async function emFatias<T, R extends { [K in keyof R]: number | unknown[] }>(
  itens: T[],
  vazio: R,
  pedir: (fatia: T[]) => Promise<R>,
): Promise<R> {
  let total = vazio;
  for (let i = 0; i < itens.length; i += TETO_POR_PAGINA) {
    total = somarResultado(total, await pedir(itens.slice(i, i + TETO_POR_PAGINA)));
  }
  return total;
}

function somarResultado<R extends { [K in keyof R]: number | unknown[] }>(a: R, b: R): R {
  const soma = { ...a };
  for (const chave of Object.keys(b) as (keyof R)[]) {
    const x = a[chave];
    const y = b[chave];
    soma[chave] = (Array.isArray(x) ? [...x, ...(y as unknown[])] : (x as number) + (y as number)) as R[keyof R];
  }
  return soma;
}

/** O que o aviso diz quando o Desfazer deu certo. */
export const FRASE_DESFEITO = "Desfeito.";

/** Junta nomes como gente escreve: "Cível", "Cível e Trabalhista",
 * "Cível, Família e Trabalhista". */
function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** Quantas voltaram com cada motivo. */
function comMotivo(lista: TarefaNaoTocada[], motivo: TarefaNaoTocada["motivo"]): TarefaNaoTocada[] {
  return lista.filter((n) => n.motivo === motivo);
}

/** As duas partes que as quatro frases dividem: quem mudou de dono no meio do
 * caminho, e quem já não existia. */
function restoComum(recusadas: TarefaNaoTocada[], ignoradas: TarefaNaoTocada[]): string[] {
  const partes: string[] = [];
  if (recusadas.length) {
    partes.push(`${contar(recusadas.length, "ficou", "ficaram")}: o responsável mudou enquanto você escolhia.`);
  }
  const sumiram = comMotivo(ignoradas, "nao_existe");
  if (sumiram.length) {
    partes.push(`${contar(sumiram.length, "já não existia", "já não existiam")}.`);
  }
  return partes;
}

/** A frase do aviso de CONCLUIR em lote.
 *
 * ⚠️ "Já estava concluída" inclui a ARQUIVADA: arquivada continua concluída, e
 * o servidor a devolve com o mesmo motivo. */
export function fraseDaConclusao(r: ResultadoDaConclusao): string {
  const partes = [`${contar(r.concluidas, "tarefa concluída", "tarefas concluídas")}.`];
  const jaEstavam = comMotivo(r.ignoradas, "ja_concluida");
  if (jaEstavam.length) {
    partes.push(`${contar(jaEstavam.length, "já estava concluída", "já estavam concluídas")}.`);
  }
  const semColuna = comMotivo(r.ignoradas, "sem_coluna_de_conclusao");
  if (semColuna.length) {
    partes.push(
      `${contar(semColuna.length, "ficou", "ficaram")}: o quadro do subgrupo não tem coluna de conclusão.`,
    );
  }
  return [...partes, ...restoComum(r.recusadas, r.ignoradas)].join(" ");
}

/** A frase do aviso de ALTERAR STATUS em lote.
 *
 * 🔴 **Segue a palavra do botão.** Se lá diz "status", aqui não pode dizer
 * "movida": duas palavras para a mesma coisa fazem a pessoa procurar a
 * diferença que não existe. É a decisão 10 do plano, e a frase sai do
 * artefato validado. */
export function fraseDoStatus(r: ResultadoDoStatus, destino: string): string {
  const partes = [`${contar(r.movidas, "tarefa agora está", "tarefas agora estão")} em “${destino}”.`];
  const jaEstavam = comMotivo(r.ignoradas, "ja_na_coluna");
  if (jaEstavam.length) {
    partes.push(contar(jaEstavam.length, "já estava.", "já estavam."));
  }
  return [...partes, ...restoComum(r.recusadas, r.ignoradas)].join(" ");
}

/** A frase do aviso de ATRIBUIR em lote -- `nome` nulo é devolver ao pool.
 *
 * 🔴 As impedidas dizem ONDE: "não é membro de Trabalhista". Sem o nome, a
 * pessoa lê "2 ficaram de fora" e não sabe em que subgrupo pedir acesso.
 *
 * ⚠️ Sem "dela"/"dele": o sistema não guarda o gênero de ninguém, e "essa
 * pessoa" diz o mesmo. */
export function fraseDaAtribuicao(r: ResultadoDaAtribuicao, nome: string | null): string {
  const partes = [
    nome
      ? `${contar(r.atribuidas, "tarefa atribuída", "tarefas atribuídas")} a ${nome}.`
      : `${contar(r.atribuidas, "tarefa devolvida ao pool", "tarefas devolvidas ao pool")}.`,
  ];
  if (r.impedidas.length) {
    const onde = [...new Set(r.impedidas.map((i) => i.subgrupo_nome || i.subgrupo_id))];
    partes.push(
      `${contar(r.impedidas.length, "ficou", "ficaram")} de fora: não é membro de ${juntarNomes(onde)}.`,
    );
  }
  const jaEram = comMotivo(r.ignoradas, "ja_e_o_responsavel");
  if (jaEram.length) {
    partes.push(
      nome
        ? `${contar(jaEram.length, "já estava com essa pessoa", "já estavam com essa pessoa")}.`
        : `${contar(jaEram.length, "já estava sem responsável", "já estavam sem responsável")}.`,
    );
  }
  return [...partes, ...restoComum(r.recusadas, r.ignoradas)].join(" ");
}

/** As tarefas que o lote de FATO tocou: as enviadas, menos as que voltaram sem
 * ser tocadas.
 *
 * 🔴 **É a base do Desfazer.** O servidor devolve só a contagem das que
 * mudaram, e a lista das que não mudaram. Desfazer sobre as ENVIADAS tiraria
 * da conclusão uma tarefa que já estava concluída antes -- e o Desfazer
 * criaria um estado que ninguém pediu. */
export function tocadas(enviadas: Tarefa[], naoTocadas: TarefaNaoTocada[]): Tarefa[] {
  const fora = new Set(naoTocadas.map((n) => `${n.subgrupo_id}:${n.tarefa_id}`));
  return enviadas.filter((t) => !fora.has(chaveDe(t)));
}

/** Agrupa pelo lugar de onde cada tarefa SAIU.
 *
 * ⚠️ O Desfazer é a chamada inversa, e as rotas do lote aceitam UM destino por
 * chamada: uma coluna no status, um responsável na atribuição. Tarefas que
 * vieram de lugares diferentes voltam em uma chamada por grupo. */
export function agruparPorOrigem(tarefas: Tarefa[], origem: (t: Tarefa) => string): Map<string, Tarefa[]> {
  const grupos = new Map<string, Tarefa[]>();
  for (const t of tarefas) {
    const chave = origem(t);
    grupos.set(chave, [...(grupos.get(chave) ?? []), t]);
  }
  return grupos;
}

/** Por que "Alterar status…" está travado -- ou `""` quando não está.
 *
 * 🔴 A coluna vem de UM quadro, e cada subgrupo tem o seu: com a seleção
 * cruzando subgrupos, o servidor recusa o pedido inteiro. Travar antes, COM o
 * motivo à vista, é melhor que deixar clicar e mostrar um erro -- e melhor que
 * esconder o botão, que parece defeito. A frase sai do artefato validado.
 */
export function motivoParaAlterarStatus(tarefas: Tarefa[]): string {
  if (tarefas.length === 0) return "Selecione alguma tarefa";
  const subgrupos = new Set(tarefas.map((t) => t.subgrupo_id)).size;
  return subgrupos > 1 ? `A seleção cruza ${subgrupos} subgrupos, e cada um tem seu quadro` : "";
}
