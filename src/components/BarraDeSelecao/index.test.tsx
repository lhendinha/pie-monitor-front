/** A barra da seleção, isolada.
 *
 * 🔴 Existia sem teste próprio -- só as três telas a cobriam. Ganhou este
 * arquivo quando a conferência em Chrome achou o link "Selecionar todas as 0":
 * o defeito mora na barra, e nenhuma tela o reproduzia em jsdom, onde a lista
 * chega no mesmo instante.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import BarraDeSelecao from "./index";
import type { BarraDeSelecaoProps } from "./types";

function montar(extra: Partial<BarraDeSelecaoProps> = {}) {
  const props: BarraDeSelecaoProps = {
    marcadas: 0,
    total: 3,
    estadoDaCaixa: "vazia",
    vinculadas: 0,
    onAlternarTopo: vi.fn(),
    onTodas: vi.fn(),
    onCancelar: vi.fn(),
    onExcluir: vi.fn(),
    ...extra,
  };
  renderComProviders(<BarraDeSelecao {...props} />);
  return props;
}

describe("BarraDeSelecao", () => {
  it("oferece 'Selecionar todas as N' quando há o que selecionar", () => {
    montar({ total: 3 });
    expect(screen.getByRole("button", { name: "Selecionar todas as 3" })).toBeInTheDocument();
  });

  it("🔴 com o universo VAZIO, não oferece 'Selecionar todas as 0'", () => {
    /* Medido em Chrome em 10/09/2026: na Agenda o universo fica vazio enquanto o
       período recarrega, e o link oferecia um clique que não fazia nada. */
    montar({ total: 0 });
    expect(screen.queryByRole("button", { name: /Selecionar todas/ })).not.toBeInTheDocument();
  });

  it("sem as ações reversíveis, a barra é só a de excluir", () => {
    /* Opcionais em conjunto: uma tela que não as passa não ganha meia barra. */
    montar();
    expect(screen.queryByRole("button", { name: "Atribuir a…" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Concluir" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir 0" })).toBeInTheDocument();
  });

  it("com as ações, a ordem é a do artefato: as reversíveis entre o Cancelar e o Excluir", () => {
    montar({
      marcadas: 1,
      estadoDaCaixa: "indeterminada",
      tarefasMarcadas: [{
        subgrupo_id: "s1", tarefa_id: "t1", titulo: "Uma", data: "2026-09-10",
        coluna_id: "c1", prioridade: "Média",
      } as never],
      subgrupoNome: (id) => id,
      onAtribuir: vi.fn(),
      onAlterarStatus: vi.fn(),
      onConcluir: vi.fn(),
    });
    const nomes = screen.getAllByRole("button").map((b) => b.textContent?.trim());
    const acoes = nomes.filter((n) => ["Cancelar", "Atribuir a…", "Alterar status…", "Concluir", "Excluir 1"].includes(n ?? ""));
    expect(acoes).toEqual(["Cancelar", "Atribuir a…", "Alterar status…", "Concluir", "Excluir 1"]);
  });
});
