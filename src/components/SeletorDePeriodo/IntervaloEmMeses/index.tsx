import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";

import { erroDoPeriodoEmMeses, opcoesDeMes } from "../../../utils";
import { COLUNA_DATAS } from "../../../theme/painelFiltro";
import { Rotulo } from "../../Rotulo";
import RodapeDeFiltro from "../../RodapeDeFiltro";
import { Select } from "../../Select";
import type { IntervaloEmMesesProps } from "./types";

/** O "Definir período…" do FLUXO: dois meses e um "Aplicar".
 *
 * 🔴 **Dois `Select`, e não o `SeletorData` do irmão.** A tabela do fluxo
 * tem uma coluna por MÊS, e um calendário pediria um dia que seria jogado
 * fora -- escolher 17/03 e ver a coluna "mar/2026" faz a pessoa achar que
 * o filtro ignorou metade do que ela disse. Com a lista de meses não existe
 * um valor inválido para escolher.
 *
 * ⚠️ Aplica no botão, e não a cada escolha, pelo mesmo motivo do irmão:
 * aplicar na primeira ponta dispararia uma busca com um período que a pessoa
 * nem terminou de montar -- e invertido, enquanto o fim ainda é o antigo.
 *
 * ⚠️ E DIZ o que está errado em vez de só apagar o botão: as duas regras
 * (invertido, mais de 24 meses) são as do servidor, e um "Aplicar" apagado
 * sem motivo faz a pessoa procurar o que faltou.
 *
 * ➡️ `../index.test.tsx`.
 */
export default function IntervaloEmMeses({ de, ate, onAplicar, onVoltar }: IntervaloEmMesesProps) {
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);

  const meses = opcoesDeMes();
  const incompleto = !inicio || !fim;
  const erro = erroDoPeriodoEmMeses(incompleto ? null : { de: inicio, ate: fim });

  return (
    <>
      <Box w={COLUNA_DATAS.largura} p={COLUNA_DATAS.padding}>
        <Rotulo variante="filtro" id="rotulo-mes-inicio" mb="6px">
          De
        </Rotulo>
        <Select
          id="mes-inicio"
          opcoes={meses}
          valor={inicio}
          onMudar={setInicio}
          placeholder="Escolher mês"
        />

        <Rotulo
          variante="filtro"
          id="rotulo-mes-fim"
          mb="6px"
          mt={COLUNA_DATAS.espacoEntreCampos}
        >
          Até
        </Rotulo>
        <Select
          id="mes-fim"
          opcoes={meses}
          valor={fim}
          onMudar={setFim}
          placeholder="Escolher mês"
        />

        {erro && (
          <Text mt="10px" fontSize="12px" fontWeight="600" color="status.bad">
            {erro}
          </Text>
        )}
      </Box>

      <RodapeDeFiltro
        rotuloSecundario="Voltar"
        onSecundario={onVoltar}
        onAplicar={() => onAplicar({ de: inicio, ate: fim })}
        aplicarDesabilitado={incompleto || Boolean(erro)}
      />
    </>
  );
}
