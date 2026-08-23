import { Flex } from "@chakra-ui/react";

import { Botao, CampoDeBusca } from "../../../../components";
import { PERIODOS } from "../../constants/kanban";
import PilulaDeMenu from "../PilulaDeMenu";
import type { FiltrosDoQuadro } from "../../types";
import type { Membro, Subgrupo } from "../../../../types";

interface Props {
  subgrupos: Subgrupo[];
  membros: Membro[];
  filtros: FiltrosDoQuadro;
  temFiltro: boolean;
  onMudar: (parcial: Partial<FiltrosDoQuadro>) => void;
  onLimpar: () => void;
}

/** A barra de filtros do quadro (`.filter-bar` do artifact).
 *
 * O seletor de subgrupo NÃO é um filtro como os outros: cada subgrupo tem o
 * próprio quadro, então trocá-lo troca de quadro. Por isso ele fica sempre
 * ativo e não entra no "Limpar filtros" -- limpar não pode deixar a tela
 * sem quadro nenhum.
 */
export default function FiltrosDoKanban({
  subgrupos,
  membros,
  filtros,
  temFiltro,
  onMudar,
  onLimpar,
}: Props) {
  return (
    <Flex align="center" gap="8px" wrap="wrap" mb="18px">
      <PilulaDeMenu
        opcoes={subgrupos.map((s) => ({ id: s.subgrupo_id, rotulo: s.nome }))}
        selecionado={filtros.subgrupoId}
        ativo
        onEscolher={(id) => onMudar({ subgrupoId: id })}
      />

      <PilulaDeMenu
        opcoes={PERIODOS.map((p) => ({ id: p.id, rotulo: p.rotulo }))}
        selecionado={filtros.periodoId}
        ativo={filtros.periodoId !== "todos"}
        onEscolher={(id) => onMudar({ periodoId: id })}
      />

      <PilulaDeMenu
        opcoes={[
          { id: "todas", rotulo: "Todas as pessoas e atribuições" },
          { id: "sem", rotulo: "Sem responsável" },
          ...membros.map((m) => ({ id: m.email, rotulo: m.apelido || m.email })),
        ]}
        selecionado={filtros.pessoa}
        ativo={filtros.pessoa !== "todas"}
        onEscolher={(id) => onMudar({ pessoa: id })}
      />

      {/* Só aparece quando há o que limpar -- botão permanente que às vezes
          não faz nada vira ruído. */}
      {temFiltro && (
        <Botao variante="ghost" onClick={onLimpar} px="13px" py="8px" fontSize="12px">
          Limpar filtros
        </Botao>
      )}

      <CampoDeBusca
        rotulo="Pesquisar cartão ou processo"
        placeholder="Pesquisar cartão ou processo"
        valor={filtros.busca}
        onMudar={(v) => onMudar({ busca: v })}
      />
    </Flex>
  );
}
