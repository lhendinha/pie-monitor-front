export interface NomeEditavelProps {
  nome: string;
  /** Como chamar o campo pra quem usa leitor de tela: "Novo nome de Cível".
   * O rótulo visível é o próprio nome, que some quando o campo aparece. */
  rotuloDoCampo?: string;
  /** Em edição, o nome vira campo no lugar (`.subgrupo-name-input`). */
  editando: boolean;
  /** Falso pra quem não tem `admin`: aí o nome é só texto. */
  podeRenomear: boolean;
  onIniciar: () => void;
  onConfirmar: (nome: string) => void;
  onCancelar: () => void;
  /** O servidor recusou o último rename (nome duplicado, por exemplo).
   *
   * O campo continua aberto pra correção -- mas sair dele sem mudar o texto
   * passa a ser "desisti" em vez de reenviar o mesmo pedido que já falhou. */
  falhou?: boolean;
  /** Chamado quando sair do campo descarta um texto que já foi recusado --
   * a tela usa pra explicar por que nada foi enviado. */
  aoDesistirDoRecusado?: () => void;
  /** O rename já foi enviado e a resposta não voltou.
   *
   * Sem isto, confirmar não mudava NADA na tela: o campo seguia editável,
   * com o texto novo, e a pessoa não sabia se o Enter tinha pegado. Fica em
   * leitura, apagado, até a linha voltar a ser texto. */
  salvando?: boolean;
}
