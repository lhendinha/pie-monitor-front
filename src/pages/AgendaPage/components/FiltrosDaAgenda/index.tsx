import { Flex } from "@chakra-ui/react";

import { MultiSelect, Select } from "../../../../components";
import { comOpcaoEscolhida, comOpcoesEscolhidas } from "../../../../hooks/useOpcoesBuscaveis";
import SeletorDeVisao from "../SeletorDeVisao";
import type { FiltrosDaAgenda as Filtros } from "../../types";
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
      <SeletorDeVisao visao={filtros.visao} onMudar={(visao) => onMudar({ visao })} />

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
