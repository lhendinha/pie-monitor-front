import { chamar } from "./client";
import type { Papel } from "../../types";

export function criarConvite(email: string, papelInicial: Papel, subgruposIniciais: string[]) {
  return chamar("/convites", {
    method: "POST",
    body: { email, papel_inicial: papelInicial, subgrupos_iniciais: subgruposIniciais },
  });
}
