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
