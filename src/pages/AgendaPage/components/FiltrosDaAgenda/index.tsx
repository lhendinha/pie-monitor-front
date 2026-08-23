import { Flex } from "@chakra-ui/react";

import { MultiSelect, PilulaDeMenu } from "../../../../components";
import SeletorDeVisao from "../SeletorDeVisao";
import type { FiltrosDaAgenda as Filtros } from "../../types";
import type { Membro, Subgrupo } from "../../../../types";

interface FiltrosDaAgendaProps {
  subgrupos: Subgrupo[];
  membros: Membro[];
  filtros: Filtros;
  carregandoSubgrupos?: boolean;
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
  membros,
  filtros,
  carregandoSubgrupos,
  onMudar,
}: FiltrosDaAgendaProps) {
  return (
    <Flex align="center" gap="8px" wrap="wrap" mb="14px">
      <SeletorDeVisao visao={filtros.visao} onMudar={(visao) => onMudar({ visao })} />

      <MultiSelect
        variante="chip"
        placeholder="Todos os subgrupos"
        opcoes={subgrupos.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
        selecionados={filtros.subgrupoIds}
        onMudar={(subgrupoIds) => onMudar({ subgrupoIds })}
        carregando={carregandoSubgrupos}
      />

      <PilulaDeMenu
        opcoes={[
          { id: "todas", rotulo: "Todas as pessoas" },
          { id: "sem", rotulo: "Sem responsável" },
          ...membros.map((m) => ({ id: m.email, rotulo: m.apelido || m.email })),
        ]}
        selecionado={filtros.pessoa}
        ativo={filtros.pessoa !== "todas"}
        onEscolher={(pessoa) => onMudar({ pessoa })}
      />
    </Flex>
  );
}
