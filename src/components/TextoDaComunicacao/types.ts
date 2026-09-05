export interface TextoDaComunicacaoProps {
  /** HTML vindo da API do PJe -- sanitizado aqui, nunca antes. */
  html?: string;
  /** Texto puro, quando a comunicação original não foi encontrada e só
   * restou o que o envio guardou. */
  textoPlano?: string;
  /** Sem teto de altura. No modal de detalhe o texto é o conteúdo
   * principal, e a própria janela já rola. */
  inteiro?: boolean;
}
