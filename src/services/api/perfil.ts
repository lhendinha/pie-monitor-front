import { chamar } from "./client";
import type { MeuPerfil } from "../../types";

/** GET /me -- o próprio registro.
 *
 * 🔴 Existe porque não havia como LER a inscrição da OAB: o login devolve só
 * e-mail e apelido, e a sessão não guarda mais nada. Sem esta chamada a tela
 * mostraria os campos vazios para quem já cadastrou, e a pessoa cadastraria
 * de novo. */
export function lerMeuPerfil() {
  return chamar("/me") as Promise<MeuPerfil>;
}

/** PATCH /me -- apelido e inscrição da OAB. E-mail e papel não se editam
 * aqui: o e-mail é a identidade da pessoa no sistema, e o papel é
 * `super_admin`.
 *
 * 🔴 **PATCH parcial de verdade: campo AUSENTE não é tocado.** Por isso os
 * dois parâmetros são opcionais e o corpo é montado com o que veio -- mandar
 * `apelido: undefined` num JSON vira campo ausente, mas mandar `""` APAGARIA
 * o apelido. Foi por essa razão que `apelido` virou opcional no schema do
 * servidor, e o front tem de fazer a parte dele.
 *
 * ⚠️ **`inscricao` com as duas partes vazias LIMPA** a OAB -- é o único jeito
 * de apagar uma cadastrada por engano. `undefined` é "não mexer"; `{numero:
 * "", uf: ""}` é "apagar". São coisas diferentes e o tipo as separa. */
export function atualizarMeuPerfil(
  campos: { apelido?: string; inscricao?: { numero: string; uf: string } },
) {
  const body: Record<string, string> = {};
  if (campos.apelido !== undefined) body.apelido = campos.apelido;
  if (campos.inscricao !== undefined) {
    body.numero_oab = campos.inscricao.numero;
    body.uf_oab = campos.inscricao.uf;
  }
  return chamar("/me", { method: "PATCH", body });
}

/** POST /senha/alterar -- exige a senha atual como prova.
 *
 * ⚠️ Trocar a senha REVOGA os refresh tokens: as outras sessões caem quando
 * tentarem renovar. Quem trocou não é deslogado na hora (o access token
 * atual vale até expirar), mas a tela precisa avisar -- ninguém espera que
 * mudar a senha derrube o celular. */
export function alterarMinhaSenha(senhaAtual: string, novaSenha: string) {
  return chamar("/senha/alterar", {
    method: "POST",
    body: { senha_atual: senhaAtual, nova_senha: novaSenha },
  });
}

/** GET /resumo -- as contagens da Área de trabalho.
 *
 * Vem do servidor, e não somado no cliente, porque cada número é uma
 * contagem sobre a coleção INTEIRA: com paginação a tela só tem uma página
 * na mão, e somar o que está nela daria um número errado e silencioso.
 *
 * Respeita o mesmo escopo das listagens -- `user`/`manager` contam só os
 * subgrupos que participam. Sem isso o número do card não bateria com a
 * lista que o clique abre. */
export function resumoDaAreaDeTrabalho() {
  return chamar("/resumo");
}
