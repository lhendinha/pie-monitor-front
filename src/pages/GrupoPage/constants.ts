/** As colunas da tabela de inscrições avulsas, na ordem do artifact.
 *
 * ⚠️ A última é `""` porque no artifact a coluna de ações é `<th></th>`: o
 * cabeçalho existe pra a contagem de colunas bater, e não tem nome.
 *
 * ⚠️ Aqui e não dentro de `InscricoesDoGrupo`, pela mesma régua que tirou
 * `COLUNAS_DA_PREVIA` de dentro de `PreviaDaImportacao` -- e, como lá, o NOME
 * muda junto com a casa: fora do componente, `COLUNAS` não diz de que tabela
 * é. */
export const COLUNAS_DAS_INSCRICOES = [
  "Inscrição",
  "Importação automática",
  "Subgrupos de destino",
  "",
] as const;

/** As cores da etiqueta de subgrupo de destino (`.etq-neutra` do artifact).
 *
 * ⚠️ Constante e não literal no JSX, pela régua que tirou `CORES` de dentro
 * de `EtiquetaDeSituacao`: cor é contrato, e um literal solto no meio da
 * linha é onde a segunda cópia nasce. */
export const CORES_DA_ETIQUETA_DE_DESTINO = {
  bg: "border.subtle",
  color: "fg.muted",
  borderColor: "border",
} as const;

/** As cores do contador "N de 50" (`.etq-info` do artifact). */
export const CORES_DO_CONTADOR_DE_INSCRICOES = {
  bg: "bg.brand.subtle",
  color: "brand.darker",
  borderColor: "brand.tint2",
} as const;
