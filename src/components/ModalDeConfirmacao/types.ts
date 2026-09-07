import type { ReactNode } from "react";

export interface ModalDeConfirmacaoProps {
  titulo: string;
  /** O que vai ser removido, em uma frase. Aceita marcação porque o nome do
   * item vem em negrito no meio dela. */
  mensagem: ReactNode;
  /** Uma escolha que a confirmação precisa fazer ANTES de confirmar --
   * hoje, o "somente este / este e os próximos" da série de lançamentos.
   *
   * 🔴 Slot próprio, e não emendado em `mensagem`: aquela renderiza dentro
   * de um `<Text>`, que é um `<p>` -- e um `<div>` dentro de `<p>` é HTML
   * inválido, que o React reclama e o navegador desmonta sozinho, movendo
   * a escolha para FORA do parágrafo. Aqui ela é irmã da frase, dentro do
   * mesmo `Stack`.
   *
   * ⚠️ Some enquanto `verificando`: escolher o alcance de uma exclusão que
   * ainda pode ser negada seria pedir uma decisão à toa. */
  escolha?: ReactNode;
  /** Recado extra em faixa amarela -- consequência que a frase principal
   * não cobre. */
  aviso?: string;
  /** Texto do botão. "Excluir" quando não vem nada. */
  rotulo?: string;
  /** Texto do botão de desistir. "Cancelar" quando não vem nada.
   *
   * 🔴 Existe por causa da guarda de descarte: lá este diálogo abre POR CIMA
   * de um formulário que continua montado, e o rodapé dele já tem um
   * "Cancelar". Dois botões com o mesmo nome acessível no mesmo documento
   * fazem o leitor de tela anunciar a mesma escolha duas vezes e quebram
   * qualquer busca por nome -- a regra está em `CONTEXT.md`, seção sobre
   * nome acessível duplicado. */
  rotuloDeCancelar?: string;
  /** Ação que dá pra desfazer (desativar, arquivar). Some a lixeira e o
   * "não pode ser desfeita": ícone de lixo em ação reversível mente, e o
   * aviso assusta à toa. */
  reversivel?: boolean;
  confirmando?: boolean;
  /** Ainda checando se dá pra excluir.
   *
   * O diálogo abre no CLIQUE, não quando a resposta chega: esperar em
   * silêncio faz a pessoa clicar de novo achando que o botão falhou. Aqui
   * ela vê o diálogo, o nome do item e que algo está em curso.
   *
   * A ação destrutiva fica travada enquanto isso -- é o que o silêncio
   * protegia, e é o único pedaço daquilo que valia a pena manter. */
  verificando?: boolean;
  /** O que está sendo verificado, em uma frase ("Conferindo o que existe
   * dentro de X…"). Só aparece com `verificando`. */
  mensagemDeEspera?: ReactNode;
  /** A verificação FALHOU -- e não saber é motivo pra não deixar seguir,
   * não pra deixar.
   *
   * Separado de `verificando` porque o que a tela deve dizer é outro: sem
   * isto o botão anunciava "Verificando…" pra sempre, prometendo uma espera
   * que nunca termina, e o esqueleto seguia pulsando como se algo viesse. */
  falhouAVerificacao?: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}
