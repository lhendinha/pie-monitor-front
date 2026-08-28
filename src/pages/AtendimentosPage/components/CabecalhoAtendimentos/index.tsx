import { Box, Flex, Text } from "@chakra-ui/react";

import {
  Botao,
  CabecalhoDePagina,
  CampoDeBusca,
  IconePlus,
  PilulaDeMenu,
  Select,
} from "../../../../components";
import type { OpcaoDeSelect } from "../../../../types";
import { contar } from "../../../../utils";
import { OPCOES_DE_STATUS, STATUS_TODOS } from "../../constants";

interface CabecalhoAtendimentosProps {
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
  /** 🔴 `primeiraPagina` de `useSubgruposBuscaveis`, NUNCA `opcoes`.
   *
   * `opcoes` encolhe conforme alguém digita na pílula, e o docstring de
   * `OpcoesBuscaveis` registra três defeitos que vieram exatamente disso --
   * inclusive um controle sumindo da tela porque a busca não achou nada.
   * Aqui isso faria o filtro de subgrupo desaparecer enquanto o modal de
   * criação estivesse sendo usado. */
  subgrupos: OpcaoDeSelect[];
  subgrupoId: string;
  onMudarSubgrupo: (subgrupoId: string) => void;
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
  subgrupos,
  subgrupoId,
  onMudarSubgrupo,
  onNovo,
}: CabecalhoAtendimentosProps) {
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
          // 🔴 Só "assunto": `atendimentos_service.listar_pagina` compara
          // apenas `a.assunto`, nunca `cliente_ids`. Prometer cliente fazia a
          // pessoa digitar o nome que estava vendo na coluna, receber
          // "Nenhum atendimento" e concluir que ela não tinha nenhum.
          placeholder="Buscar por assunto"
        />
        <PilulaDeMenu
          opcoes={OPCOES_DE_STATUS.map((o) => ({ id: o.id, rotulo: o.rotulo }))}
          selecionado={status}
          ativo={status !== STATUS_TODOS}
          onEscolher={onMudarStatus}
        />
        {/* ⚠️ Some para quem tem UM subgrupo: ali ele não filtra nada, e um
            controle sem efeito é pior que controle nenhum. Mesma régua da
            pílula de subgrupo em Processos. */}
        {subgrupos.length > 1 && (
          <Select
            variante="chip"
            placeholder="Todos os subgrupos"
            opcoes={subgrupos}
            valor={subgrupoId}
            onMudar={onMudarSubgrupo}
            permitirLimpar
          />
        )}
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
