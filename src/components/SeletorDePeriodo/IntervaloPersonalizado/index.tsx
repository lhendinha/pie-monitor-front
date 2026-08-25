import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";

import { COLUNA_DATAS } from "../../../theme/painelFiltro";
import { Rotulo } from "../../Rotulo";
import SeletorData from "../../SeletorData";
import RodapeDeFiltro from "../../RodapeDeFiltro";
import type { IntervaloDeDatas } from "../../../types";

interface IntervaloPersonalizadoProps {
  /** Rascunho inicial -- o intervalo já aplicado, se houver. */
  de: string;
  ate: string;
  onAplicar: (intervalo: IntervaloDeDatas) => void;
  onVoltar: () => void;
}

/** O "Definir período…": duas datas e um "Aplicar".
 *
 * ⚠️ Diverge do artifact de propósito. Lá é UM calendário com as pontas
 * realçadas (`.dp-day.inrange`); aqui são dois campos, o mesmo desenho do
 * filtro de datas de Processos. O motivo é concreto: `SeletorData` já
 * resolve os tropeços do `DatePicker` do zag (ids gerados que não podem ser
 * sobrescritos, `unmountOnExit` pra não engolir clique, largura da grade
 * contra a receita da lib) e é acessível por teclado. Um calendário de
 * intervalo significaria refazer tudo isso em modo `range`.
 *
 * Aplica no botão, e não a cada clique: escolhendo as duas pontas, aplicar
 * na primeira dispararia uma busca com um intervalo que a pessoa nem
 * terminou de montar -- e, pior, invertido enquanto o fim ainda é o antigo.
 */
export default function IntervaloPersonalizado({ de, ate, onAplicar, onVoltar }: IntervaloPersonalizadoProps) {
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);
  /** Só um calendário aberto por vez: abrir um é a mesma operação que
   * fechar o outro. */
  const [calendario, setCalendario] = useState<"inicio" | "fim" | null>(null);

  const invertido = Boolean(inicio && fim && inicio > fim);
  const incompleto = !inicio || !fim;

  return (
    <>
      <Box w={COLUNA_DATAS.largura} p={COLUNA_DATAS.padding}>
        <Rotulo variante="filtro" id="rotulo-periodo-inicio" mb="6px">
          De
        </Rotulo>
        <SeletorData
          id="periodo-inicio"
          rotuladoPor="rotulo-periodo-inicio"
          valor={inicio}
          onMudar={setInicio}
          placeholder="Escolher data"
          aberto={calendario === "inicio"}
          onAbertura={(a) => setCalendario(a ? "inicio" : null)}
        />

        <Rotulo
          variante="filtro"
          id="rotulo-periodo-fim"
          mb="6px"
          mt={COLUNA_DATAS.espacoEntreCampos}
        >
          Até
        </Rotulo>
        <SeletorData
          id="periodo-fim"
          rotuladoPor="rotulo-periodo-fim"
          valor={fim}
          onMudar={setFim}
          placeholder="Escolher data"
          aberto={calendario === "fim"}
          onAbertura={(a) => setCalendario(a ? "fim" : null)}
        />

        {/* Diz o problema em vez de só desabilitar o botão: botão apagado
            sem motivo faz a pessoa procurar o que faltou. */}
        {invertido && (
          <Text mt="10px" fontSize="12px" fontWeight="600" color="status.bad">
            A data inicial vem depois da final.
          </Text>
        )}
      </Box>

      <RodapeDeFiltro
        rotuloSecundario="Voltar"
        onSecundario={onVoltar}
        onAplicar={() => onAplicar({ de: inicio, ate: fim })}
        aplicarDesabilitado={incompleto || invertido}
      />
    </>
  );
}
