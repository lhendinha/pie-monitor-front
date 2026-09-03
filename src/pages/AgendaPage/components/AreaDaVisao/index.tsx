import { Stack } from "@chakra-ui/react";

import { Cartao, EstadoVazio } from "../../../../components";
import { paraIso } from "../../../../utils/calendario";
import { somarDias } from "../../periodoDaAgenda";
import ListaDeUmDia from "../ListaDeUmDia";
import VisaoPorMes from "../VisaoPorMes";
import VisaoPorSemana from "../VisaoPorSemana";
import { DIAS_DA_LISTA } from "../../constants";
import type { FiltrosDaAgenda as Filtros } from "../../types";
import type { Tarefa } from "../../../../types";

interface AreaDaVisaoProps {
  filtros: Filtros;
  dataVisivel: Date;
  isoDeHoje: string;
  porDia: Map<string, Tarefa[]>;
  assuntoDoAtendimento: (id: string) => string | undefined;
  subgrupoNome: (id: string) => string;
  onAbrirTarefa: (tarefa: Tarefa) => void;
  onEscolherDia: (iso: string) => void;
}

/** Escolhe a visão. Separado do corpo da página só pra que o `return` dela
 * caiba num olhar -- quatro ternários aninhados no meio do JSX escondem a
 * estrutura da tela. */
export default function AreaDaVisao({
  filtros,
  dataVisivel,
  isoDeHoje,
  porDia,
  assuntoDoAtendimento,
  subgrupoNome,
  onAbrirTarefa,
  onEscolherDia,
}: AreaDaVisaoProps) {
  /* 🔴 No modo atrasadas os três ramos de calendário são PULADOS e a
     renderização cai na lista, lá embaixo.
     As outras visões são recortes de calendário, e aqui a lista ignora o
     calendário: renderizar o mês mostraria a grade do mês corrente com zero
     pontinhos -- a tela dizendo que não há nada atrasado. A pílula de visão
     fica desabilitada, então isto só é alcançado ao LIGAR o filtro estando
     noutra visão. */
  const atrasadas = filtros.periodo === "atrasadas";

  if (!atrasadas && filtros.visao === "semana") {
    return (
      <VisaoPorSemana
        data={dataVisivel}
        isoDeHoje={isoDeHoje}
        porDia={porDia}
        onEscolherDia={onEscolherDia}
      />
    );
  }

  if (!atrasadas && filtros.visao === "mes") {
    return (
      <VisaoPorMes
        data={dataVisivel}
        isoDeHoje={isoDeHoje}
        porDia={porDia}
        onEscolherDia={onEscolherDia}
      />
    );
  }

  if (!atrasadas && filtros.visao === "dia") {
    const tarefas = porDia.get(paraIso(dataVisivel)) || [];
    if (tarefas.length === 0) {
      return (
        <Cartao>
          <EstadoVazio mensagem="Nenhuma tarefa com data neste dia." />
        </Cartao>
      );
    }
    return (
      <ListaDeUmDia
        data={dataVisivel}
        tarefas={tarefas}
        subgrupoNome={subgrupoNome}
        assuntoDoAtendimento={assuntoDoAtendimento}
        onAbrir={onAbrirTarefa}
        /* A barra de datas logo acima já diz que dia é este. */
        comData={false}
      />
    );
  }

  /* Em lista: só os dias COM tarefa, na ordem. Mostrar catorze cabeçalhos
     pra encontrar três com conteúdo faria rolar a tela à toa.

     🔴 No modo atrasadas os dias vêm do RESULTADO, não de uma janela. A
     consulta já traz só o que interessa (abertas, `data < hoje`), e a
     janela de 14 dias pra frente não conteria nenhuma delas -- tarefa
     atrasada está no passado, então a lista sairia vazia com uma mensagem
     falando de "próximos 14 dias". */
  const dias = atrasadas
    ? [...porDia.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([iso, tarefas]) => ({ dia: new Date(`${iso}T00:00:00`), tarefas }))
    : Array.from({ length: DIAS_DA_LISTA }, (_, i) => somarDias(dataVisivel, i))
        .map((dia) => ({ dia, tarefas: porDia.get(paraIso(dia)) || [] }))
        .filter((grupo) => grupo.tarefas.length > 0);

  if (dias.length === 0) {
    return (
      <Cartao>
        <EstadoVazio
          mensagem={
            atrasadas
              ? "Nenhuma tarefa atrasada."
              : `Nenhuma tarefa nos próximos ${DIAS_DA_LISTA} dias.`
          }
        />
      </Cartao>
    );
  }

  return (
    <Stack gap="12px">
      {dias.map(({ dia, tarefas }) => (
        <ListaDeUmDia
          key={paraIso(dia)}
          data={dia}
          tarefas={tarefas}
          subgrupoNome={subgrupoNome}
          assuntoDoAtendimento={assuntoDoAtendimento}
          onAbrir={onAbrirTarefa}
        />
      ))}
    </Stack>
  );
}
