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
  /* 🔴 Logo DEPOIS de "Vínculo", e não no fim (02/09/2026): o subgrupo
     qualifica o vínculo -- "Vínculo" diz a que processo o documento pertence,
     e o subgrupo diz de onde esse processo é. Qualificador longe do que ele
     qualifica obriga o olho a atravessar a linha e voltar, que é o oposto do
     que ajuda a distinguir dois documentos parecidos.

     ⚠️ A régua NÃO é "última coluna". Membros tem o subgrupo no fim porque
     são 4 colunas e ele cai lá por consequência; Processos o tem na 3ª, na
     ordem do artifact. O que se padroniza é o NOME e o desenho. */
  "Subgrupo",
  "Responsável",
  "Adicionado em",
] as const;
