export interface ItemDeMovimentacaoProps {
  titulo: string;
  meta: string;
  /** Abre o detalhe. Sem isto a linha é só leitura -- e sem afordância
   * nenhuma de clique, que é o que se espera de um bloco de texto. */
  onAbrir?: () => void;
  /** Última linha da lista não desenha divisória. */
  ultimo?: boolean;
}
