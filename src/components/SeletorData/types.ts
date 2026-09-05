export interface SeletorDataProps {
  /** Vai num `Box` que ENVOLVE o seletor -- nunca num elemento da lib.
   *
   * ⚠️ O `DatePicker` do zag encontra as próprias partes pelos ids que ele
   * gera, e sobrescrever qualquer um deles quebra a funcionalidade sem
   * erro nenhum:
   *
   * - no gatilho: ele deixa de ser exceção da dispensa por clique fora
   *   (`exclude: [..., dom.getTriggerEl(scope)]`), o `pointerdown` no
   *   próprio campo vira "clique fora" e fecha, e o `click` reabre -- o
   *   campo não alternava;
   * - no `Control`: some a âncora de posicionamento e o calendário abre no
   *   canto da tela, em (0,0). */
  id: string;
  /** `id` do rótulo que nomeia o campo. Substitui o `htmlFor`, que exigiria
   * pôr o `id` no gatilho. */
  rotuladoPor?: string;
  valor: string;
  onMudar: (iso: string) => void;
  placeholder?: string;
  /** Abertura controlada de fora.
   *
   * Existe pra quando há MAIS DE UM seletor no mesmo painel: sem um dono
   * único do estado, abrir o segundo calendário deixava os dois na tela, e
   * clicar de novo no que já estava aberto fechava e reabria. Quem
   * controla decide que só um fica aberto por vez.
   *
   * Omitido, o componente se vira sozinho (é o caso dentro dos modais). */
  aberto?: boolean;
  onAbertura?: (aberto: boolean) => void;
}
