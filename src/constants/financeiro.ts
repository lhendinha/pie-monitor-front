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
