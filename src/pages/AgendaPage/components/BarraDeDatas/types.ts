export interface BarraDeDatasProps {
  rotulo: string;
  onNavegar: (passo: number) => void;
  onHoje: () => void;
  /** Modo "Atrasadas": a lista ignora o calendário, então setas e "Hoje"
   * saem -- navegar período não mudaria nada.
   *
   * ⚠️ O RÓTULO fica, e é quem passa a dizer o que está na tela. Ele some
   * junto seria perder a única frase que explica a lista; mantê-lo com o mês
   * navegado seria pior ainda -- "Agosto de 2026" sobre tarefas de julho é a
   * tela afirmando o contrário do que é. Quem escreve o texto certo é
   * `rotuloDeAtrasadas`. */
  semNavegacao?: boolean;
}
