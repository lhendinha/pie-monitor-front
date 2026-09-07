/** A NATUREZA de uma categoria: de que lado do caixa ela soma.
 *
 * 🔴 As palavras que a API manda e recebe, e o pior lugar do sistema para
 * escrevê-las à mão: `natureza === "saida"` funciona hoje e vira sempre
 * falso no dia em que a palavra mudar -- e aqui isso é dinheiro somado do
 * lado errado. É o defeito que o backend já levou, e a razão de
 * `NATUREZA_ENTRADA` e `NATUREZA_SAIDA` existirem dos dois lados.
 *
 * ⚠️ São valores de runtime -- o `Select` do modal itera sobre eles --, por
 * isso ficam em `constants/` e não em `types/`. Ver a seção 0c do
 * `CONTEXT.md`.
 */
export const NATUREZA_ENTRADA = "entrada";
export const NATUREZA_SAIDA = "saida";
export const NATUREZAS = [NATUREZA_ENTRADA, NATUREZA_SAIDA] as const;

/** O TIPO de uma conta: o que decide se ela tem dados bancários.
 *
 * ⚠️ `corrente` pede banco, agência e número; `outros` (o caixa do
 * escritório, a carteira do sócio) não tem nenhum dos três. A API valida a
 * palavra, e o artifact esconde o bloco quando o tipo é `outros`.
 *
 * ⚠️ A lista já vem no formato do `Select` porque é assim que ela é usada --
 * o rótulo é da TELA e o valor é da API, e separá-los em duas listas era
 * onde a divergência entraria.
 */
export const TIPO_CONTA_CORRENTE = "corrente";
export const TIPO_CONTA_OUTROS = "outros";
export const TIPOS_DE_CONTA = [
  { value: TIPO_CONTA_CORRENTE, label: "Conta corrente" },
  { value: TIPO_CONTA_OUTROS, label: "Outros" },
];

/** O TIPO de um lançamento: qual dos quatro formulários o criou.
 *
 * 🔴 Mesma régua da natureza, e pelo mesmo motivo: `tipo === "saida"` escrito
 * à mão funciona hoje e vira sempre falso no dia em que a palavra mudar --
 * e aqui isso é uma linha aparecendo do lado errado da tela.
 *
 * ⚠️ Honorário é uma ENTRADA com parcelas, não um lado próprio: a natureza
 * dele é `entrada`. O tipo diz de onde ele veio, a natureza diz para onde
 * ele soma -- e é por isso que os dois existem.
 */
export const TIPO_HONORARIO = "honorario";
export const TIPO_ENTRADA = "entrada";
export const TIPO_SAIDA = "saida";
export const TIPO_TRANSFERENCIA = "transferencia";

/** A SITUAÇÃO de um lançamento, derivada na leitura pela API.
 *
 * 🔴 Nunca é gravada: um "atrasado" vira "efetivado" no dia em que alguém o
 * baixa, sem ninguém reescrever nada. A tela recebe pronta e não recalcula
 * -- refazer a conta aqui daria duas respostas para a mesma pergunta no dia
 * em que a régua mudasse de um lado só.
 *
 * ⚠️ `aberto` INCLUI `atrasado` quando usado como FILTRO: atrasado é um
 * aberto que venceu. Como valor de um lançamento, os dois são distintos.
 */
export const SITUACAO_ABERTO = "aberto";
export const SITUACAO_ATRASADO = "atrasado";
export const SITUACAO_EFETIVADO = "efetivado";
