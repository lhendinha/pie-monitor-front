import { List, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import Botao from "../Botao";
import Faixa from "../Faixa";
import Modal from "../Modal";
import RodapeDeAcoes from "../RodapeDeAcoes";

interface Props {
  titulo: string;
  mensagem: ReactNode;
  /** Os itens que a mensagem anuncia ("... ainda tem:"), um por linha.
   * Lista, e não frase corrida: quatro impedimentos separados por vírgula
   * viram um parágrafo que ninguém conta. */
  itens?: string[];
  /** Recado extra em faixa amarela -- tipicamente o que fazer pra
   * destravar. */
  detalhe?: string;
  onFechar: () => void;
}

/** Diálogo de recado: uma informação e um "Entendi".
 *
 * Separado do `ModalDeConfirmacao` de propósito. Reaproveitar aquele pra
 * avisar colava no recado um botão VERMELHO com lixeira escrito "Entendi",
 * um "Cancelar" que fazia exatamente a mesma coisa, e a frase "Essa ação
 * não pode ser desfeita" -- que além de falsa, assusta à toa.
 */
export default function ModalDeAviso({ titulo, mensagem, itens, detalhe, onFechar }: Props) {
  return (
    <Modal
      titulo={titulo}
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao onClick={onFechar}>Entendi</Botao>
        </RodapeDeAcoes>
      }
    >
      <Stack gap="14px">
        <Stack gap="8px">
          <Text fontSize="13.5px" lineHeight="1.5">
            {mensagem}
          </Text>
          {itens && itens.length > 0 && (
            /* 26px de recuo: o artifact usa a indentação cheia do
               navegador, que joga a lista longe demais da frase que a
               apresenta. Aqui ela fica claramente recuada e ainda alinhada
               com o parágrafo. */
            <List.Root ps="26px" fontSize="13.5px" lineHeight="1.5">
              {itens.map((item) => (
                /* ⚠️ A cor do marcador vem da receita do Chakra
                   (`fg.subtle`), que é o cinza slate -- as bolinhas saíam
                   quase apagadas ao lado do texto. No artifact o marcador é
                   da cor do texto, porque lá é `<ul>` puro. */
                <List.Item key={item} _marker={{ color: "fg" }}>
                  {item}
                </List.Item>
              ))}
            </List.Root>
          )}
        </Stack>
        {detalhe && (
          <Faixa tom="aviso" aEsquerda>
            {detalhe}
          </Faixa>
        )}
      </Stack>
    </Modal>
  );
}
