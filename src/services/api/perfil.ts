import { chamar } from "./client";

/** PATCH /me -- só o apelido. E-mail e papel não se editam aqui: o e-mail é
 * a identidade da pessoa no sistema, e o papel é `super_admin`. */
export function atualizarMeuPerfil(apelido: string) {
  return chamar("/me", { method: "PATCH", body: { apelido } });
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
