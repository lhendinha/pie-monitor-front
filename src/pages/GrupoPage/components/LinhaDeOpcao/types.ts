import type { OpcaoProcesso } from "../../../../types";

export interface LinhaDeOpcaoProps {
  opcao: OpcaoProcesso;
  /** Falso pra quem não tem `admin`: a linha vira só leitura, sem arrastar
   * e sem ações. */
  podeGerenciar: boolean;
  editando: boolean;
  onIniciarRenome: () => void;
  onRenomear: (rotulo: string) => void;
  onCancelarRenome: () => void;
  onDesativar: () => void;
  onReativar: () => void;
  /** Alguma ação DESTA linha está em voo. Trava os botões dela -- sem isso,
   * clicar em "Reativar" não muda nada até o refetch chegar, e a pessoa
   * clica de novo. Por linha, e não pela lista toda: numa lista de vinte
   * fases, travar tudo esconde qual delas está mudando. */
  emAndamento?: boolean;
}
