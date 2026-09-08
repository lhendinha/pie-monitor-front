export interface CampoDeValorProps {
  id: string;
  /** O valor em CENTAVOS, ou `null` com o campo vazio.
   *
   * 🔴 `null` e não `0`: vazio e "zero reais" são coisas diferentes, e
   * confundi-los faria o formulário aceitar um lançamento sem valor achando
   * que alguém quis zero. Mesma régua de `centavosDoTexto`. */
  valor: number | null;
  onMudar: (centavos: number | null) => void;
  placeholder?: string;
  desabilitado?: boolean;
}
