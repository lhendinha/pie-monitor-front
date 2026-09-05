export interface EstadoDeErroProps {
  /** O que não deu certo, do ponto de vista de quem lê -- "Não foi possível
   * carregar os processos." Sem jargão de rede. */
  mensagem: string;
  /** `query.refetch`. Sem isto o estado vira um beco: hoje o sistema não tem
   * NENHUM botão de tentar de novo, e a única saída é F5. */
  onTentarDeNovo: () => void;
  /** A tentativa está em curso. */
  tentando?: boolean;
}
