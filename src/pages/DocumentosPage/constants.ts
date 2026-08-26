/** As colunas da tabela de documentos.
 *
 * "Vínculo" é uma coluna só porque as três coisas que ela mostra --
 * processo, atendimento e cliente -- respondem à mesma pergunta ("a que isto
 * pertence") e raramente vêm todas juntas. Três colunas dariam duas vazias
 * na maioria das linhas.
 */
export const COLUNAS_DE_DOCUMENTOS = [
  "Documento",
  "Tipo",
  "Vínculo",
  "Responsável",
  "Adicionado em",
] as const;
