/** Por que um e-mail saiu: novidade do PJe, ou aviso de prazo.
 *
 * ⚠️ Mora em `constants/` e não na pasta do Histórico porque a Área de
 * trabalho também aponta para cá -- o card "Movimentações (7 dias)" abre o
 * histórico já filtrado, e o valor do filtro tem de ser o MESMO. Era literal
 * nos dois lados.
 *
 * ⚠️ Vocabulário do HISTÓRICO, e não o dos tipos de notificação: a palavra
 * "lembrete" aparece nos dois por coincidência de idioma. Casá-los prenderia
 * o sino ao e-mail, que são coisas diferentes -- `TIPO_LEMBRETE`, de
 * `constants/notificacoes.ts`, é a outra.
 *
 * ⚠️ Vazio ("") é "sem filtro", e por isso não entra na dupla: é ausência de
 * valor, não um terceiro tipo.
 */
export const TIPO_ENVIO_MOVIMENTACAO = "movimentacao";
export const TIPO_ENVIO_LEMBRETE = "lembrete";
export const TIPOS_DE_ENVIO_DO_HISTORICO = [
  TIPO_ENVIO_MOVIMENTACAO,
  TIPO_ENVIO_LEMBRETE,
] as const;
