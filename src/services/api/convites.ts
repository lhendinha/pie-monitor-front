import { chamar, comGrupoAlvo } from "./client";
import type { Papel } from "../../types";

export function criarConvite(
  email: string,
  papelInicial: Papel,
  subgruposIniciais: string[],
  grupoIdAlvo?: string
) {
  return chamar(
    "/convites",
    comGrupoAlvo(
      { method: "POST", body: { email, papel_inicial: papelInicial, subgrupos_iniciais: subgruposIniciais } },
      grupoIdAlvo
    )
  );
}
