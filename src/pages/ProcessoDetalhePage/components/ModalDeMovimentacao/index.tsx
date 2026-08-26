import { Link, Stack, Text } from "@chakra-ui/react";

import {
  Botao,
  CampoDeLeitura,
  Modal,
  RodapeDeAcoes,
  TextoDaComunicacao,
} from "../../../../components";
import { formatarData } from "../../../../utils";
import type { Comunicacao } from "../../../../types";

interface ModalDeMovimentacaoProps {
  comunicacao: Comunicacao;
  /** Leva ao e-mail que avisou desta movimentação, no Histórico. Ausente
   * quando não houve e-mail -- ver `tem_envio`. */
  onVerOEnvio?: () => void;
  onFechar: () => void;
}

/** Os detalhes de UMA movimentação.
 *
 * 🔴 Existe porque a lista deixou de trazer o texto do tribunal (ver
 * `ItemDeMovimentacao`): cinco publicações inteiras empilhadas, cada uma
 * num bloco rolável de 200px, tornavam a lista impercorrível -- e o teor
 * que interessa é sempre o de UM item. Tem endereço próprio na URL
 * (`?comunicacao=`), então dá pra mandar pra alguém e sobrevive a um F5.
 *
 * ⚠️ **Não é o "Detalhes do envio" do Histórico, e a diferença é o assunto.**
 * Lá se olha uma NOTIFICAÇÃO -- quem recebeu, se entregou; aqui, a
 * PUBLICAÇÃO. Uma movimentação existe tenha ou não gerado e-mail, e a
 * maioria não gerou: o robô grava o acervo inteiro do processo e só notifica
 * o que está dentro da janela. Por isso os detalhes daqui nunca dependem do
 * envio -- ele só acrescenta um caminho, quando existe.
 */
export default function ModalDeMovimentacao({
  comunicacao,
  onVerOEnvio,
  onFechar,
}: ModalDeMovimentacaoProps) {
  return (
    <Modal
      largo
      titulo="Detalhes da movimentação"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          {/* O documento no tribunal já vinha na resposta (`link`) e não
              aparecia em lugar nenhum da interface. É o único caminho pro
              documento oficial em todo o sistema.

              ⚠️ `<a>` de verdade, e não `BotaoDeLink`: aquele é `<button>`
              de propósito (a docstring dele diz), e botão não abre em outra
              aba nem oferece "copiar endereço".

              ⚠️ `noopener` junto do `target`: sem ele a página aberta ganha
              `window.opener` e pode navegar esta aqui pra onde quiser. */}
          {comunicacao.link && (
            <Link
              href={comunicacao.link}
              target="_blank"
              rel="noopener noreferrer"
              mr="auto"
              fontSize="12.5px"
              fontWeight="700"
              color="fg.brand"
            >
              Abrir o documento no tribunal
            </Link>
          )}
          {/* ⚠️ Sem "Fechar" no rodapé: o X do cabeçalho já é esse
              controle, e dois botões com o MESMO nome acessível no mesmo
              diálogo fazem o leitor de tela anunciar a escolha duas vezes --
              e quebram qualquer busca por nome. */}
          {onVerOEnvio && <Botao onClick={onVerOEnvio}>Ver o e-mail enviado</Botao>}
        </RodapeDeAcoes>
      }
    >
      <Stack gap="16px">
        {/* Rótulo e valor, e não etiquetas soltas no topo: isto é uma tela
            de DETALHE, e "TJMG" sozinho não diz se é o órgão, o tribunal ou
            o autor. Mesmo par de leitura do detalhe do envio. */}
        <CampoDeLeitura rotulo="Tipo de comunicação">
          <Text fontSize="13.5px">{comunicacao.tipo_comunicacao || "—"}</Text>
        </CampoDeLeitura>

        <CampoDeLeitura rotulo="Disponibilizada em">
          <Text fontSize="13.5px">
            {comunicacao.data_disponibilizacao
              ? formatarData(comunicacao.data_disponibilizacao)
              : "—"}
          </Text>
        </CampoDeLeitura>

        <CampoDeLeitura rotulo="Órgão">
          <Text fontSize="13.5px">{comunicacao.nome_orgao || "—"}</Text>
        </CampoDeLeitura>

        <CampoDeLeitura rotulo="Teor da publicação">
          {/* O ramo do texto ausente é explícito: `TextoDaComunicacao` não
              desenha nada sem conteúdo, e um campo com rótulo e nada
              embaixo parece tela quebrada, não publicação sem teor. */}
          {comunicacao.texto ? (
            <TextoDaComunicacao inteiro html={comunicacao.texto} />
          ) : (
            <Text fontSize="13px" color="fg.subtle">
              Esta movimentação chegou sem o texto da publicação.
            </Text>
          )}
        </CampoDeLeitura>
      </Stack>
    </Modal>
  );
}
