import type { ReactNode } from "react";
import type { Descarte } from "../../types";

export interface ModalProps {
  titulo: string;
  /** Uma linha de contexto embaixo do título -- tipicamente uma contagem.
   * Fica no cabeçalho porque ele não rola: assim a informação continua
   * visível quando o corpo do modal já rolou pra longe dela. */
  subtitulo?: string;
  onFechar: () => void;
  /** O que fazer quando alguém tenta fechar. Ver `Descarte`.
   *
   * 🔴 **Obrigatória.** Modal com formulário passa `{ mudou }`; modal de
   * leitura ou de confirmação passa `"semFormulario"`. Não há padrão, e é
   * essa a proteção: um modal novo não compila enquanto ninguém decidir. */
  descarte: Descarte;
  /** `wide` (760px) para os modais de formulário longo -- é a variante
   * `.modal.wide` do artifact. */
  largo?: boolean;
  /** Ações do rodapé. Ficam FORA da área que rola: no artifact
   * `.modal-foot` é irmão de `.modal-body`, não filho. Dentro, os botões
   * sobem junto com o conteúdo e somem da vista em formulário longo. */
  rodape?: ReactNode;
  /** Uma ação no CABEÇALHO, à esquerda do X.
   *
   * ⚠️ Existe porque o rodapé nem sempre serve: em `ModalDeMovimentacao` ele
   * é condicional de propósito (*"rodapé SÓ quando há pra onde ir;
   * `RodapeDeAcoes` vazio desenharia uma faixa cinza no pé do modal sem nada
   * dentro"*), e pôr uma ação lá o tornaria incondicional pra todo mundo.
   *
   * 🔴 Ela e o X vão dentro de um `Flex` próprio, e NÃO como irmãos diretos
   * do título: aquele `Flex` é `justify="space-between"` com dois filhos
   * (título e X), e um terceiro faria a ação flutuar no MEIO do cabeçalho,
   * longe do botão de fechar. */
  acaoNoCabecalho?: ReactNode;
  children: ReactNode;
}
