import { Box, Flex, Text } from "@chakra-ui/react";

import {
  Botao,
  CabecalhoDePagina,
  CampoDeBusca,
  IconePlus,
  PilulaDeMenu,
} from "../../../../components";
import { contar } from "../../../../utils";
import { OPCOES_DE_STATUS, STATUS_TODOS } from "../../constants";

interface Props {
  carregando: boolean;
  /** Quantos a página mostra, e quantos existem no total -- "Mostrando 3 de
   * 12 atendimentos", como no artifact. */
  mostrando: number;
  total: number;
  busca: string;
  onBuscar: (valor: string) => void;
  /** O que a lista mostra ainda não corresponde ao que está escrito no
   * campo -- espera entre teclas ou consulta em voo. */
  buscando?: boolean;
  status: string;
  onMudarStatus: (status: string) => void;
  onNovo: () => void;
}

export default function CabecalhoAtendimentos({
  carregando,
  mostrando,
  total,
  busca,
  onBuscar,
  buscando,
  status,
  onMudarStatus,
  onNovo,
}: Props) {
  return (
    <Box mb="14px">
      <CabecalhoDePagina
        titulo="Atendimentos"
        subtitulo="Conversas e providências registradas por cliente."
        acoes={
          <Botao onClick={onNovo}>
            <IconePlus />
            Adicionar atendimento
          </Botao>
        }
      />

      <Flex align="center" gap="8px" wrap="wrap" mb="10px">
        <CampoDeBusca
          rotulo="Buscar atendimentos"
          valor={busca}
          onMudar={onBuscar}
          placeholder="Buscar por assunto ou cliente"
        />
        <PilulaDeMenu
          opcoes={OPCOES_DE_STATUS.map((o) => ({ id: o.id, rotulo: o.rotulo }))}
          selecionado={status}
          ativo={status !== STATUS_TODOS}
          onEscolher={onMudarStatus}
        />
      </Flex>

      {/* A contagem só aparece quando há número de verdade. Durante a
          espera ela diria "Mostrando 0 de 0", que é uma afirmação falsa
          sobre uma lista que ainda não chegou. */}
      <Text fontSize="12.5px" color="fg.muted" minH="18px">
        {carregando || buscando
          ? ""
          : `Mostrando ${mostrando} de ${contar(total, "atendimento", "atendimentos")}`}
      </Text>
    </Box>
  );
}
