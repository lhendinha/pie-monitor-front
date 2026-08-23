import { chamar } from "./client";
import type { Papel } from "../../types";
import type {
  RespostaDeConvite,
} from "../../types/respostas";

export function criarConvite(email: string, papelInicial: Papel, subgruposIniciais: string[]) {
  return chamar("/convites", {
    method: "POST",
    body: { email, papel_inicial: papelInicial, subgrupos_iniciais: subgruposIniciais },
  });
}

/** O convite ainda vale? Consultado quando a página do link ABRE.
 *
 * Devolve só `{ valido }` -- quem consulta ainda não provou ser o
 * destinatário, então o e-mail convidado e o papel não vêm junto.
 */
export function verificarConvite(token: string) {
  return chamar(`/convites/${encodeURIComponent(token)}`) as Promise<RespostaDeConvite>;
}
