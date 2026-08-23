import { Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import Botao from "../Botao";
import Esqueleto from "../Esqueleto";
import Faixa from "../Faixa";
import { IconeLixeira } from "../Icons";
import Modal from "../Modal";
import RodapeDeAcoes from "../RodapeDeAcoes";

interface ModalDeConfirmacaoProps {
  titulo: string;
  /** O que vai ser removido, em uma frase. Aceita marcação porque o nome do
   * item vem em negrito no meio dela. */
  mensagem: ReactNode;
  /** Recado extra em faixa amarela -- consequência que a frase principal
   * não cobre. */
  aviso?: string;
  /** Texto do botão. "Excluir" quando não vem nada. */
  rotulo?: string;
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

/** O diálogo de confirmação de toda exclusão do sistema.
 *
 * Existe porque `window.confirm` não serve: ele é do navegador, não do
 * sistema -- não dá pra pôr o nome do que vai sumir em negrito, nem a faixa
 * de aviso, nem um botão vermelho; trava a aba inteira; e em alguns
 * navegadores a pessoa consegue silenciá-lo, o que transforma "excluir" em
 * um clique sem volta e sem pergunta.
 */
export default function ModalDeConfirmacao({
  titulo,
  mensagem,
  aviso,
  rotulo,
  reversivel,
  confirmando,
  verificando,
  mensagemDeEspera,
  falhouAVerificacao,
  onConfirmar,
  onFechar,
}: ModalDeConfirmacaoProps) {
  return (
    <Modal
      titulo={titulo}
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={onConfirmar}
            disabled={confirmando || verificando || falhouAVerificacao}
          >
            {!reversivel && <IconeLixeira />}
            {confirmando
              ? "Excluindo…"
              : verificando && !falhouAVerificacao
                ? "Verificando…"
                : rotulo || "Excluir"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <Stack gap="14px">
        <Text fontSize="13.5px" lineHeight="1.5" aria-live="polite">
          {verificando ? mensagemDeEspera : mensagem}
        </Text>
        {/* UMA barra, na altura da linha de apoio que aparece depois ("Essa
            ação não pode ser desfeita"). A frase principal já ocupa o lugar
            dela em cima, então o esqueleto só precisa cobrir o que sobra.
            Com duas barras o diálogo saltava 29px pra cima quando a resposta
            chegava -- medido no navegador. */}
        {verificando && !falhouAVerificacao && <Esqueleto linhas={1} altura="15px" />}
        {/* Em falha, faixa em vez de esqueleto: não há nada a caminho. */}
        {falhouAVerificacao && (
          <Faixa tom="aviso" aEsquerda>
            Enquanto isso não carregar, a exclusão fica bloqueada.
          </Faixa>
        )}
        {!verificando && aviso && (
          <Faixa tom="aviso" aEsquerda>
            {aviso}
          </Faixa>
        )}
        {!verificando && !reversivel && (
          <Text fontSize="11.5px" color="fg.subtle">
            Essa ação não pode ser desfeita.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
