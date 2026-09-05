export interface NovoRegistroProps {
  enviando: boolean;
  /** Resolve quando o registro FOI gravado, rejeita se falhou -- é o que
   * diz ao campo se ele pode se limpar. */
  onEnviar: (texto: string) => Promise<unknown>;
}
