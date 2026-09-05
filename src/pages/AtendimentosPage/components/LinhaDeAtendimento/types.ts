import type { Atendimento } from "../../../../types";

export interface LinhaDeAtendimentoProps {
  atendimento: Atendimento;
  /** Nome de cada cliente vinculado. O atendimento guarda só os ids, e quem
   * resolve os nomes é a página -- numa consulta só pra lista inteira, em
   * vez de uma por linha. */
  /** Apelido de quem escreveu o último registro. O registro guarda só o
   * e-mail, e o avatar tira as iniciais do que receber -- sem resolver, a
   * lista mostrava as iniciais do E-MAIL ("jo") enquanto o detalhe mostrava
   * as do nome ("JM"), pra mesma pessoa. */
  /** Traduz `subgrupo_id` em nome. Vem da PÁGINA pela mesma razão dos nomes
   * de cliente logo acima: uma consulta para a lista inteira, não uma por
   * linha. */
  subgrupoNome: (id: string) => string;
  onAbrir: (atendimento: Atendimento) => void;
  ultima?: boolean;
}
