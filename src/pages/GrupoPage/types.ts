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
