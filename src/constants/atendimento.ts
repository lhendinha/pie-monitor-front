/** Os status possíveis de um atendimento, e cada um com nome próprio.
 *
 * Aqui, e não em `types`: é valor de runtime (o seletor itera sobre ele), e
 * `types` guarda tipo. O tipo sai daqui derivado, como em
 * `constants/prioridade.ts` -- assim as duas coisas não podem divergir.
 *
 * ⚠️ Os nomes existem porque a lista sozinha não serve para APONTAR um
 * status: quem quer "o em andamento" escrevia a palavra de novo, e era o que
 * `AtendimentosPage` e `theme/atendimento` faziam -- três lugares donos da
 * mesma frase, sem nada cobrando que concordassem.
 *
 * ⚠️ São as palavras que a API manda e recebe, com inicial maiúscula: mudar
 * qualquer uma aqui é mudar o contrato com o servidor, não um rótulo.
 *
 * As CORES de cada status ficam em `theme/atendimento.ts`: que status
 * existem é regra de domínio, com que cor aparecem é decisão visual.
 */
export const STATUS_EM_ANDAMENTO = "Em andamento";
export const STATUS_FECHADO = "Fechado";
export const STATUS_DE_ATENDIMENTO = [STATUS_EM_ANDAMENTO, STATUS_FECHADO] as const;
