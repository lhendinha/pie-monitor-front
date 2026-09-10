import { Stack, Text } from "@chakra-ui/react";

import Botao from "../Botao";
import Esqueleto from "../Esqueleto";
import Faixa from "../Faixa";
import { IconeLixeira } from "../Icons";
import Modal from "../Modal";
import RodapeDeAcoes from "../RodapeDeAcoes";
import type { ModalDeConfirmacaoProps } from "./types";

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
  detalhe,
  escolha,
  aviso,
  rotulo,
  rotuloDeCancelar,
  reversivel,
  varianteDoBotao,
  rotuloConfirmando,
  nota,
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
      /* Um diálogo de confirmação não tem formulário: o que se perde ao
         fechá-lo é a pergunta, não trabalho digitado. */
      descarte="semFormulario"
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={onFechar}>
            {rotuloDeCancelar || "Cancelar"}
          </Botao>
          <Botao
            variante={varianteDoBotao ?? "perigo"}
            onClick={onConfirmar}
            disabled={confirmando || verificando || falhouAVerificacao}
          >
            {!reversivel && <IconeLixeira />}
            {confirmando
              ? rotuloConfirmando || "Excluindo…"
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
        {!verificando && detalhe}
        {!verificando && escolha}
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
        {!verificando && reversivel && nota && (
          <Text fontSize="11.5px" color="fg.subtle">
            {nota}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
