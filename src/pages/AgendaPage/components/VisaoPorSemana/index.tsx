import { Grid, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../components";

import { DIAS_DA_SEMANA_CURTOS } from "../../constants";
import { CORES_DA_PRIORIDADE } from "../../../../constants";
import { inicioDaSemana, somarDias } from "../../periodoDaAgenda";
import { paraIso } from "../../../../utils/calendario";
import type { Tarefa } from "../../../../types";

/** Quantas tarefas cabem num cartão de dia antes do "+N mais". */
const TAREFAS_VISIVEIS = 3;

interface VisaoPorSemanaProps {
  data: Date;
  isoDeHoje: string;
  porDia: Map<string, Tarefa[]>;
  onEscolherDia: (iso: string) => void;
}

/** A faixa de 7 dias (`.week-strip` do artifact).
 *
 * Cada cartão leva PRO DIA em vez de abrir a tarefa: a faixa é uma visão
 * panorâmica, e o detalhe mora na visão "Por dia".
 *
 * ⚠️ `minmax(0, 1fr)`, não `1fr`: com `1fr` a coluna herda `min-width: auto`
 * e um título longo empurra a largura mínima do cartão, estourando as sete
 * colunas pra fora do container. É o motivo de a visão por semana quebrar --
 * está anotado no próprio artifact.
 */
export default function VisaoPorSemana({
  data,
  isoDeHoje,
  porDia,
  onEscolherDia,
}: VisaoPorSemanaProps) {
  const inicio = inicioDaSemana(data);

  return (
    <Grid
      templateColumns="repeat(7, minmax(0, 1fr))"
      gap="8px"
      /* ⚠️ Media query literal, e não um breakpoint do Chakra: a medida é
         840px, do artifact, e o mais próximo da escala do Chakra é 768px --
         perto o bastante pra parecer igual e longe o bastante pra deixar
         tablet estreito com sete colunas espremidas.

         Abaixo dela a faixa ROLA na horizontal com coluna de 112px, em vez
         de encolher: sete colunas num celular dão ~50px cada, e o título da
         tarefa vira duas letras e reticências. */
      css={{
        "@media (max-width: 840px)": {
          gridTemplateColumns: "repeat(7, minmax(112px, 1fr))",
          overflowX: "auto",
          paddingBottom: "6px",
        },
      }}
    >
      {DIAS_DA_SEMANA_CURTOS.map((nomeDoDia, indice) => {
        const dia = somarDias(inicio, indice);
        const iso = paraIso(dia);
        const tarefas = porDia.get(iso) || [];
        const ehHoje = iso === isoDeHoje;

        return (
          <BotaoNu
            key={iso}
            type="button"
            onClick={() => onEscolherDia(iso)}
            aria-label={`${nomeDoDia}, dia ${dia.getDate()}`}
            minW="0"
            display="flex"
            flexDirection="column"
            gap="6px"
            textAlign="left"
            p="9px"
            minH="130px"
            borderWidth="1px"
            borderStyle="solid"
            borderColor={ehHoje ? "fg.brand" : "border"}
            bg={ehHoje ? "bg.brand.subtle" : "bg.surface"}
            borderRadius="md"
            _hover={{ borderColor: "fg.brand" }}
          >
            <Text
              fontSize="10.5px"
              fontWeight="800"
              color="fg.muted"
              textTransform="uppercase"
            >
              {nomeDoDia}
            </Text>
            <Text fontSize="17px" fontWeight="800" fontFamily="mono">
              {dia.getDate()}
            </Text>

            {tarefas.slice(0, TAREFAS_VISIVEIS).map((tarefa) => {
              const concluida = tarefa.esta_concluida ?? false;
              const alta = tarefa.prioridade === "Alta";
              return (
                <Text
                  key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
                  title={tarefa.titulo}
                  maxW="100%"
                  minW="0"
                  truncate
                  fontSize="10.5px"
                  fontWeight="700"
                  borderRadius="5px"
                  px="6px"
                  py="3px"
                  bg={alta ? "bg.bad.subtle" : "border.subtle"}
                  color={
                    concluida
                      ? "fg.subtle"
                      : alta
                        ? CORES_DA_PRIORIDADE.Alta
                        : undefined
                  }
                  textDecoration={concluida ? "line-through" : undefined}
                >
                  {tarefa.titulo}
                </Text>
              );
            })}

            {tarefas.length > TAREFAS_VISIVEIS && (
              <Text fontSize="10.5px" fontWeight="700" color="fg.muted" px="6px" py="3px">
                +{tarefas.length - TAREFAS_VISIVEIS} mais
              </Text>
            )}
          </BotaoNu>
        );
      })}
    </Grid>
  );
}
