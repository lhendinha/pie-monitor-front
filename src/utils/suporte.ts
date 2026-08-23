import { EMAIL_DE_SUPORTE } from "../constants/suporte";

interface QuemPede {
  /** `null` porque é o que a sessão devolve quando o dado não está lá --
   * aceitar aqui evita um `?? undefined` em cada chamada. */
  apelido?: string | null;
  email?: string | null;
}

/** Monta o `mailto:` do Suporte com assunto e corpo já preenchidos.
 *
 * Leva apelido e e-mail no ASSUNTO de propósito: quem responde precisa saber
 * de quem é o pedido, e essa informação é a primeira que se perde num
 * "preciso de ajuda" solto. O corpo abre com um convite pra descrever o
 * problema -- uma janela em branco costuma virar mensagem de uma linha.
 */
export function montarLinkDeSuporte({ apelido, email }: QuemPede): string {
  const quem = [apelido, email && `(${email})`].filter(Boolean).join(" ");
  const assunto = `Suporte - ${quem || "Argos"}`;
  const corpo =
    "Olá, preciso de ajuda com o Argos.\n\nDescreva aqui o que está acontecendo:\n\n";
  return `mailto:${EMAIL_DE_SUPORTE}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
