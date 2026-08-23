import { Flex } from "@chakra-ui/react";

import {
  CampoDeBusca,
  PilulaDeFiltro,
  PilulaDeMenu,
  SeletorDePeriodo,
} from "../../../../components";

import type { FiltrosDoQuadro } from "../../types";
import type { Membro, Subgrupo } from "../../../../types";

interface Props {
  subgrupos: Subgrupo[];
  membros: Membro[];
  filtros: FiltrosDoQuadro;
  onMudar: (parcial: Partial<FiltrosDoQuadro>) => void;
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
  onMudar,
}: Props) {
  return (
    <Flex align="center" gap="8px" wrap="wrap" mb="18px">
      <PilulaDeMenu
        opcoes={subgrupos.map((s) => ({ id: s.subgrupo_id, rotulo: s.nome }))}
        selecionado={filtros.subgrupoId}
        ativo
        onEscolher={(id) => onMudar({ subgrupoId: id })}
      />

      <SeletorDePeriodo
        periodoId={filtros.periodoId}
        intervaloPersonalizado={filtros.intervaloPersonalizado}
        onMudar={(periodoId, intervaloPersonalizado) =>
          onMudar({ periodoId, intervaloPersonalizado })
        }
      />

      <PilulaDeMenu
        opcoes={[
          { id: "todas", rotulo: "Todas as pessoas" },
          { id: "sem", rotulo: "Sem responsável" },
          ...membros.map((m) => ({ id: m.email, rotulo: m.apelido || m.email })),
        ]}
        selecionado={filtros.pessoa}
        ativo={filtros.pessoa !== "todas"}
        onEscolher={(id) => onMudar({ pessoa: id })}
      />

      {/* Sem "Limpar filtros" aqui, por escolha, DIVERGINDO do artifact --
          lá existem dois (este e o do estado vazio) e eles aparecem juntos
          quando o filtro zera o quadro, que é a duplicata visível na tela.
          Ficou só o do estado vazio.

          A conta: com filtro aplicado e cartões à vista, não sobra botão de
          limpar -- a saída é trocar cada pílula de volta na mão. */}
      {/* Alterna, não filtra: ligar ADICIONA a coluna de Arquivado, nunca
          esconde tarefa. Por isso fica fora do "Limpar filtros" e o rótulo
          descreve o ESTADO ("Sem arquivadas" / "Com arquivadas"), como as
          outras pílulas da barra -- e não a ação. */}
      <PilulaDeFiltro
        ativo={filtros.mostrarArquivadas}
        semSeta
        aria-pressed={filtros.mostrarArquivadas}
        onClick={() => onMudar({ mostrarArquivadas: !filtros.mostrarArquivadas })}
      >
        {filtros.mostrarArquivadas ? "Com arquivadas" : "Sem arquivadas"}
      </PilulaDeFiltro>

      <CampoDeBusca
        rotulo="Pesquisar cartão ou processo"
        placeholder="Pesquisar cartão ou processo"
        valor={filtros.busca}
        onMudar={(v) => onMudar({ busca: v })}
      />
    </Flex>
  );
}
