import { Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import Botao from "../Botao";
import Faixa from "../Faixa";
import { IconeLixeira } from "../Icons";
import Modal from "../Modal";
import RodapeDeAcoes from "../RodapeDeAcoes";

interface Props {
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
  onConfirmar,
  onFechar,
}: Props) {
  return (
    <Modal
      titulo={titulo}
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={onConfirmar} disabled={confirmando}>
            {!reversivel && <IconeLixeira />}
            {confirmando ? "Excluindo…" : rotulo || "Excluir"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <Stack gap="14px">
        <Text fontSize="13.5px" lineHeight="1.5">
          {mensagem}
        </Text>
        {aviso && (
          <Faixa tom="aviso" aEsquerda>
            {aviso}
          </Faixa>
        )}
        {!reversivel && (
          <Text fontSize="11.5px" color="fg.subtle">
            Essa ação não pode ser desfeita.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
