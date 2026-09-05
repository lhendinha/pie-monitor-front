export interface RodapeDeFiltroProps {
  /** "Cancelar" no painel de situação/fase, "Limpar datas" no de datas --
   * é a única diferença entre os dois rodapés do artifact. */
  rotuloSecundario: string;
  onSecundario: () => void;
  onAplicar: () => void;
  /** Trava o "Aplicar" enquanto a escolha não fecha -- intervalo pela
   * metade ou invertido. Quem usa isto tem que dizer NA TELA o que falta:
   * botão apagado sem explicação faz a pessoa procurar o motivo. */
  aplicarDesabilitado?: boolean;
}
