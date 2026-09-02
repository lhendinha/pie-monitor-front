import { Stack, Text } from "@chakra-ui/react";

import { Botao, CampoDeLeitura, Modal, RodapeDeAcoes } from "../../../../components";
import { formatarData, mascararNumeroProcesso } from "../../../../utils";
import type { Processo } from "../../../../types";

interface ModalDoProcessoProps {
  processo: Processo;
  /** Rótulo da situação, já resolvido -- a tela é quem tem o catálogo. */
  situacao: string;
  /** Rótulo da fase, idem. */
  fase: string;
  onAbrirProcesso: () => void;
  onFechar: () => void;
}

/** O resumo de um processo do cliente.
 *
 * 🔴 É RESUMO, não uma segunda tela de processo. A pergunta que se faz aqui
 * é "qual dos processos deste cliente é este?", e ela se responde com meia
 * dúzia de campos -- editar, ver movimentações e tarefas continua tendo um
 * lugar só, que é a tela do processo.
 *
 * Daí o "Abrir processo" no rodapé: quem precisa de mais que o resumo vai
 * pro endereço de verdade, em vez de encontrar aqui uma cópia empobrecida
 * da outra tela que envelhece sozinha.
 */
export default function ModalDoProcesso({
  processo,
  situacao,
  fase,
  onAbrirProcesso,
  onFechar,
}: ModalDoProcessoProps) {
  return (
    <Modal
      descarte="semFormulario"
      titulo={processo.apelido || "Processo"}
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          {/* Só a ação. Fechar é o X do cabeçalho -- um segundo controle
              chamado "Fechar" duplicaria o nome acessível dentro do mesmo
              diálogo. */}
          <Botao onClick={onAbrirProcesso}>Abrir processo</Botao>
        </RodapeDeAcoes>
      }
    >
      <Stack gap="16px">
        <CampoDeLeitura rotulo="Número">
          <Text fontSize="13.5px" fontFamily="mono">
            {mascararNumeroProcesso(processo.numero_processo)}
          </Text>
        </CampoDeLeitura>

        <CampoDeLeitura rotulo="Situação">
          <Text fontSize="13.5px">{situacao || "—"}</Text>
        </CampoDeLeitura>

        <CampoDeLeitura rotulo="Fase">
          <Text fontSize="13.5px">{fase || "—"}</Text>
        </CampoDeLeitura>

        {/* O travessão é deliberado: campo vazio some da tela, e sumir faz
            parecer que a informação não existe no sistema quando o que
            houve foi ninguém ter preenchido. */}
        <CampoDeLeitura rotulo="Prazo final">
          <Text fontSize="13.5px">
            {processo.prazo_final ? formatarData(processo.prazo_final) : "—"}
          </Text>
        </CampoDeLeitura>
      </Stack>
    </Modal>
  );
}
