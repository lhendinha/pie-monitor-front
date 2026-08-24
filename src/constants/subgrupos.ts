/** Dois formulários pedem subgrupo (convidar alguém e editar membro), e nos
 * dois a regra é a mesma. Um texto só pra que não divirjam no primeiro
 * ajuste.
 *
 * Serve de dica e de erro: o `Campo` mostra a mesma frase em cinza enquanto
 * o campo está vazio e em vermelho quando a pessoa tenta salvar assim. O
 * texto não muda porque a instrução não muda -- só a urgência dela. */
export const ESCOLHA_UM_SUBGRUPO = "Escolha pelo menos um subgrupo.";

/** O formulário de editar membro confere os subgrupos atuais antes de
 * liberar o envio, porque o servidor reconcilia pelo conjunto exato enviado
 * -- e, pra cada subgrupo removido, solta as tarefas de quem saiu. Se essa
 * conferência falhar, salvar por cima removeria participação que alguém
 * acabou de criar, em silêncio. */
export const FALHOU_AO_CONFERIR_SUBGRUPOS =
  "Não foi possível conferir os subgrupos atuais. Feche e abra de novo antes de salvar.";
