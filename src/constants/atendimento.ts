/** Os status possíveis de um atendimento.
 *
 * Aqui, e não em `types`: é valor de runtime (o seletor itera sobre ele), e
 * `types` guarda tipo. O tipo sai daqui derivado, como em
 * `constants/prioridade.ts` -- assim as duas coisas não podem divergir.
 *
 * As CORES de cada status ficam em `theme/atendimento.ts`: que status
 * existem é regra de domínio, com que cor aparecem é decisão visual.
 */
export const STATUS_DE_ATENDIMENTO = ["Em andamento", "Fechado"] as const;
