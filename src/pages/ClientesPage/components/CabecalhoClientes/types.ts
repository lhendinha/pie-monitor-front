export interface CabecalhoClientesProps {
  carregando: boolean;
  total: number;
  /** Quantos estão REALMENTE na tabela.
   *
   * 🔴 A busca passou a ter teto no servidor (50), mas `total` continua sendo
   * a contagem real -- e tem que continuar, senão a tela diria "50 clientes"
   * pra quem tem 4.000. O efeito colateral era pior que o problema: a linha
   * anunciava "120 clientes" com 50 linhas embaixo, sem dizer por quê. É o
   * mesmo corte silencioso que os painéis de filtro passaram a avisar; lista
   * truncada em silêncio se lê como lista inteira.
   *
   * ⚠️ O aviso só vale COM busca. Sem ela a lista também mostra menos que o
   * total -- é uma página de dez -- mas ali existe barra de páginas, e mandar
   * "refine a busca" seria apontar a saída errada.
   *
   * ⚠️ E só quando a tabela já corresponde ao que está escrito (`!buscando`).
   * Durante a espera entre teclas o que está na tela ainda é o resultado
   * ANTERIOR, e a frase falaria dele como se fosse do termo novo. */
  exibidos: number;
  busca: string;
  onBuscar: (valor: string) => void;
  /** O que a tabela mostra ainda não corresponde ao que está escrito no
   * campo -- espera entre teclas ou consulta em voo. */
  buscando?: boolean;
  podeCriar: boolean;
  onNovoCliente: () => void;
}
