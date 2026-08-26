import { Flex } from "@chakra-ui/react";

import { MultiSelect, Select } from "../../../../components";
import { comOpcaoEscolhida, comOpcoesEscolhidas } from "../../../../hooks/useOpcoesBuscaveis";
import { PERIODOS_DA_AGENDA } from "../../constants";
import SeletorDeVisao from "../SeletorDeVisao";
import type { FiltrosDaAgenda, FiltrosDaAgenda as Filtros } from "../../types";
import type { OpcoesBuscaveis } from "../../../../hooks/useOpcoesBuscaveis";

interface FiltrosDaAgendaProps {
  /** Primeira página + busca -- ver `useSubgruposBuscaveis`. */
  subgrupos: OpcoesBuscaveis;
  /** Idem, pras pessoas. Só carrega quando a pílula abre. */
  pessoas: OpcoesBuscaveis;
  filtros: Filtros;
  onMudar: (parcial: Partial<Filtros>) => void;
}

/** A barra de filtros da Agenda.
 *
 * A visão vem primeiro porque muda o que a tela É, não o que ela mostra --
 * as outras duas pílulas filtram dentro da visão escolhida.
 *
 * ⚠️ O subgrupo aqui é MÚLTIPLO, ao contrário do Kanban: lá cada subgrupo
 * tem o próprio quadro e trocar de subgrupo troca de quadro; aqui a agenda
 * é uma projeção por data, e ver "Cível e Trabalhista na mesma semana" é a
 * pergunta natural. Nenhum escolhido = todos, que é o que o servidor já
 * entende quando o parâmetro não vai.
 */
export default function FiltrosDaAgenda({
  subgrupos,
  pessoas,
  filtros,
  onMudar,
}: FiltrosDaAgendaProps) {
  const opcoesDeSubgrupo = comOpcoesEscolhidas(
    subgrupos.opcoes,
    filtros.subgrupoIds,
    filtros.subgrupoNomes,
  );

  return (
    <Flex align="center" gap="8px" wrap="wrap" mb="14px">
      {/* 🔴 Desabilitado no modo atrasadas. "Atrasada" está sempre no passado
          e a Agenda abre no mês corrente -- uma visão de calendário com esse
          filtro mostraria zero. Ele TRAVA em lista, e a pílula diz por quê em
          vez de sumir: controle que some parece defeito. */}
      <SeletorDeVisao
        visao={filtros.visao}
        onMudar={(visao) => onMudar({ visao })}
        desabilitado={filtros.periodo === "atrasadas"}
        motivo="Em Atrasadas a lista ignora o calendário"
      />

      <Select
        variante="chip"
        placeholder="Todos os períodos"
        opcoes={[...PERIODOS_DA_AGENDA].filter((o) => o.value !== "")}
        valor={filtros.periodo === "todos" ? "" : filtros.periodo}
        /* 🔴 Ligar "Atrasadas" muda a VISÃO junto, e não é conveniência.
           O modo ignora o calendário e renderiza a lista de qualquer forma;
           sem trocar `visao`, a pílula ao lado -- agora desabilitada --
           continuaria exibindo "Por mês" sobre uma lista corrida. Rótulo
           dizendo uma coisa e conteúdo sendo outra é o defeito que esta tela
           acabou de perder.

           Desligar NÃO volta a visão anterior: a pessoa fica em "Em lista",
           que é o que ela está vendo. Restaurar a de antes seria a tela
           mudando sozinha sem ninguém pedir. */
        onMudar={(periodo) => {
          const novo = (periodo || "todos") as FiltrosDaAgenda["periodo"];
          onMudar(novo === "atrasadas" ? { periodo: novo, visao: "lista" } : { periodo: novo });
        }}
        permitirLimpar
      />

      <MultiSelect
        variante="chip"
        placeholder="Todos os subgrupos"
        opcoes={opcoesDeSubgrupo}
        selecionados={filtros.subgrupoIds}
        /* Guarda o NOME de cada escolhido junto: sem isso, um subgrupo fora
           da primeira página sumiria do próprio valor na reabertura. */
        onMudar={(subgrupoIds) =>
          onMudar({
            subgrupoIds,
            subgrupoNomes: Object.fromEntries(
              subgrupoIds.map((id) => [
                id,
                opcoesDeSubgrupo.find((o) => o.value === id)?.label ?? id,
              ]),
            ),
          })
        }
        permitirLimpar
        carregando={subgrupos.carregando}
        onBuscar={subgrupos.buscar}
        placeholderBusca="Buscar subgrupo"
        erro={subgrupos.erro}
        onTentarDeNovo={subgrupos.tentarDeNovo}
      />

      {/* Mesma tradução do Kanban: "Todas as pessoas" é a linha do topo do
          painel, e o estado que corresponde a ela é `"todas"`. */}
      <Select
        variante="chip"
        placeholder="Todas as pessoas"
        opcoes={[
          { value: "sem", label: "Sem responsável" },
          ...comOpcaoEscolhida(
            pessoas.opcoes,
            filtros.pessoa === "todas" || filtros.pessoa === "sem" ? "" : filtros.pessoa,
            filtros.pessoa,
          ),
        ]}
        valor={filtros.pessoa === "todas" ? "" : filtros.pessoa}
        onMudar={(pessoa) => onMudar({ pessoa: pessoa || "todas" })}
        permitirLimpar
        carregando={pessoas.carregando}
        onBuscar={pessoas.buscar}
        placeholderBusca="Buscar pessoa"
        erro={pessoas.erro}
        onTentarDeNovo={pessoas.tentarDeNovo}
      />
    </Flex>
  );
}
