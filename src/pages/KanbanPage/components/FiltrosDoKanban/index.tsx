import { Flex } from "@chakra-ui/react";

import {
  CampoDeBusca,
  PilulaDeFiltro,
  Select,
  SeletorDePeriodo,
} from "../../../../components";
import { comOpcaoEscolhida } from "../../../../hooks/useOpcoesBuscaveis";

import type { FiltrosDoQuadro } from "../../types";
import type { OpcoesBuscaveis } from "../../../../hooks/useOpcoesBuscaveis";

interface FiltrosDoKanbanProps {
  /** Primeira página + busca -- ver `useSubgruposBuscaveis`. */
  subgrupos: OpcoesBuscaveis;
  /** O nome do subgrupo em uso, que pode estar fora da primeira página. */
  subgrupoNome: string;
  /** Idem, pras pessoas. Só carrega quando a pílula abre. */
  pessoas: OpcoesBuscaveis;
  filtros: FiltrosDoQuadro;
  onMudar: (parcial: Partial<FiltrosDoQuadro>) => void;
  /** Trocar de quadro é o que a memória do subgrupo precisa observar. */
  onEscolherSubgrupo: (id: string, nome: string) => void;
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
  subgrupoNome,
  pessoas,
  filtros,
  onMudar,
  onEscolherSubgrupo,
}: FiltrosDoKanbanProps) {
  const opcoesDeSubgrupo = comOpcaoEscolhida(subgrupos.opcoes, filtros.subgrupoId, subgrupoNome);

  return (
    <Flex align="center" gap="8px" wrap="wrap" mb="18px">
      {/* Sem "Todas as X" e sem X de limpar: esta pílula ESCOLHE o quadro, não
          filtra. Limpar deixaria a tela sem quadro nenhum. */}
      <Select
        variante="chip"
        placeholder="Subgrupo"
        opcoes={opcoesDeSubgrupo}
        valor={filtros.subgrupoId}
        onMudar={(id) =>
          onEscolherSubgrupo(id, opcoesDeSubgrupo.find((o) => o.value === id)?.label ?? "")
        }
        comOpcaoTodas={false}
        carregando={subgrupos.carregando}
        onBuscar={subgrupos.buscar}
        placeholderBusca="Buscar subgrupo"
        erro={subgrupos.erro}
        onTentarDeNovo={subgrupos.tentarDeNovo}
      />

      <SeletorDePeriodo
        periodoId={filtros.periodoId}
        intervaloPersonalizado={filtros.intervaloPersonalizado}
        onMudar={(periodoId, intervaloPersonalizado) =>
          onMudar({ periodoId, intervaloPersonalizado })
        }
      />

      {/* "Todas as pessoas" é a linha do topo do painel (`placeholder`), e o
          estado que corresponde a ela é `"todas"` -- daí a tradução nos dois
          sentidos. "Sem responsável" é opção de verdade: não é ausência de
          filtro, é um filtro por ausência.

          O e-mail serve de rótulo pra quem está fora da primeira página:
          identifica a pessoa, que é o que a etiqueta precisa fazer. */}
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
        onMudar={(v) => onMudar({ pessoa: v || "todas" })}
        permitirLimpar
        carregando={pessoas.carregando}
        onBuscar={pessoas.buscar}
        placeholderBusca="Buscar pessoa"
        erro={pessoas.erro}
        onTentarDeNovo={pessoas.tentarDeNovo}
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
