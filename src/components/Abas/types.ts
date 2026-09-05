/** Uma aba da barra: o que a identifica e o que se lê nela. */
export interface Aba<T extends string> {
  id: T;
  rotulo: string;
}

export interface AbasProps<T extends string> {
  abas: Aba<T>[];
  ativa: T;
  onMudar: (id: T) => void;
  /** Prefixo dos `id`/`aria-controls`, pra duas listas de abas na mesma
   * página não colidirem. Combina com o `grupo` do `PainelDaAba`. */
  grupo: string;
}
