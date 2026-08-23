import { Box, Flex, Grid } from "@chakra-ui/react";

import { BotaoNu } from "../../../../components";

import { DIAS_DA_SEMANA_CURTOS, PONTOS_POR_CELULA } from "../../constants";
import { gradeDoMes } from "../../../../utils/calendario";
import type { Tarefa } from "../../../../types";

interface VisaoPorMesProps {
  data: Date;
  isoDeHoje: string;
  porDia: Map<string, Tarefa[]>;
  onEscolherDia: (iso: string) => void;
}

/** A grade do mês (`.month-grid` do artifact): 7 colunas × 6 semanas.
 *
 * Reaproveita `gradeDoMes`, a mesma função do calendário do `SeletorData` --
 * seis semanas fixas e os dias de fora do mês marcados em vez de omitidos.
 * Duas grades independentes começariam a semana em dias diferentes no
 * primeiro ajuste.
 *
 * A célula mostra PONTOS, não títulos: no mês inteiro não há largura pra
 * texto, e o ponto responde a "tem coisa nesse dia?", que é a pergunta que
 * a visão mensal existe pra responder. O detalhe vem clicando no dia.
 *
 * O fundo da grade é a própria borda: `gap: 1px` sobre `bg="border"` desenha
 * as divisórias sem 42 bordas que se somam em dobro nos encontros.
 */
export default function VisaoPorMes({ data, isoDeHoje, porDia, onEscolherDia }: VisaoPorMesProps) {
  const grade = gradeDoMes(data.getFullYear(), data.getMonth());

  return (
    <Grid
      templateColumns="repeat(7, minmax(0, 1fr))"
      gap="1px"
      bg="border"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border"
      borderRadius="lg"
      overflow="hidden"
    >
      {DIAS_DA_SEMANA_CURTOS.map((nome) => (
        <Box
          key={nome}
          bg="bg.subtle"
          textAlign="center"
          fontSize="11px"
          fontWeight="800"
          color="fg.muted"
          textTransform="uppercase"
          py="8px"
        >
          {nome}
        </Box>
      ))}

      {grade.map((celula) => {
        const tarefas = porDia.get(celula.iso) || [];
        const ehHoje = celula.iso === isoDeHoje;

        return (
          <BotaoNu
            key={celula.iso}
            type="button"
            onClick={() => onEscolherDia(celula.iso)}
            aria-label={`Dia ${celula.dia}${tarefas.length ? `, ${tarefas.length} tarefa(s)` : ""}`}
            minW="0"
            w="100%"
            minH="84px"
            p="6px"
            /* Célula mais baixa no celular (640px do artifact): com 84px a
               grade de seis semanas não cabe na tela e o mês fica sem
               visão de conjunto, que é o motivo de existir esta visão. */
            css={{
              "@media (max-width: 640px)": { minHeight: "52px", padding: "4px" },
            }}
            display="flex"
            flexDirection="column"
            gap="5px"
            textAlign="left"
            bg={celula.doMes ? "bg.surface" : "bg.subtle"}
            _hover={{ bg: "bg.subtle" }}
          >
            <Flex
              align="center"
              justify="center"
              w="21px"
              h="21px"
              borderRadius="full"
              fontSize="12px"
              fontWeight="800"
              fontFamily="mono"
              bg={ehHoje ? "fg.brand" : undefined}
              color={ehHoje ? "white" : celula.doMes ? undefined : "fg.subtle"}
            >
              {celula.dia}
            </Flex>

            {tarefas.length > 0 && (
              <Flex gap="3px">
                {tarefas.slice(0, PONTOS_POR_CELULA).map((tarefa) => (
                  <Box
                    key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg="fg.brand"
                  />
                ))}
              </Flex>
            )}
          </BotaoNu>
        );
      })}
    </Grid>
  );
}
