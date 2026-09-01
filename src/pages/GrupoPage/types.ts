import type { InscricaoAvulsa } from "../../types";

/** O que a mutation de renomear recebe. */
export interface RenomearOpcao {
  id: string;
  rotulo: string;
}

/** PATCH parcial: só o que mudou vai. */
export interface CamposDasConfiguracoes {
  nome?: string;
  dias_para_arquivar?: number;
}

/** Uma gravação da lista de inscrições avulsas.
 *
 * 🔴 **Uma FUNÇÃO, e não a lista pronta** -- e a razão é o motivo de a
 * gravação existir assim. `InscricoesDoGrupo` relê a lista do servidor antes
 * de montar o corpo, então a lista nova só pode ser calculada depois dessa
 * releitura. Passar o array já montado o calcularia sobre o cache velho, que é
 * exatamente o que a releitura evita.
 */
export interface PedidoDeGravacao {
  /** A inscrição que a pessoa mexeu -- `""` numa adição, que não tem linha
   * ainda. É o que aponta o "em andamento" para a linha certa em vez de travar
   * a lista inteira. */
  alvo: string;
  /** Roda DEPOIS da releitura, sobre a lista fresca do servidor. */
  aplicar: (atuais: InscricaoAvulsa[]) => InscricaoAvulsa[];
}
