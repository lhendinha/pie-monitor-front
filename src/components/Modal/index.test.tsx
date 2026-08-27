import { screen } from "@testing-library/react";
import { memo, useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import Modal from ".";

describe("pilha de modais", () => {
  /** 🔴 Com `[onFechar]` nas dependências, um callback com identidade nova
   * a cada render fazia o modal ABERTO sair e voltar pro TOPO da pilha --
   * invertendo a ordem. O diálogo de cima passaria a perder o Escape pro
   * formulário de baixo, que é o oposto do que a pilha existe pra garantir.
   *
   * Nenhum chamador dispara isso hoje porque o React Compiler memoiza os
   * callbacks -- mascaramento, não correção: basta um `onFechar` inline
   * sem memoização. */
  it("Escape fecha só o de CIMA, mesmo se o de baixo re-registrar", async () => {
    const user = userEvent.setup();
    const fecharDeBaixo = vi.fn();
    /* ⚠️ ESTÁVEL de propósito: só o de BAIXO pode re-registrar.
     *
     * A primeira versão deste teste re-renderizava os dois, e aí ambos
     * saíam e voltavam pra pilha -- a ordem relativa se preservava e a
     * mutação passava. A inversão exige que UM se reregistre sozinho. */
    const fecharDeCima = vi.fn();

    function DeCima() {
      return (
        <Modal titulo="De cima" onFechar={fecharDeCima}>
          conteúdo
        </Modal>
      );
    }
    const DeCimaMemo = memo(DeCima);

    function Cena() {
      const [n, forcar] = useState(0);
      return (
        <>
          {/* `onFechar` com identidade nova a cada render: com deps em
              `[onFechar]`, este sai e volta pro TOPO da pilha. */}
          <Modal titulo="De baixo" onFechar={() => fecharDeBaixo(n)}>
            <button onClick={() => forcar((x) => x + 1)}>re-render</button>
          </Modal>
          <DeCimaMemo />
        </>
      );
    }
    renderComProviders(<Cena />);

    await user.click(screen.getByRole("button", { name: "re-render" }));
    await user.keyboard("{Escape}");

    expect(fecharDeCima).toHaveBeenCalledTimes(1);
    expect(fecharDeBaixo).not.toHaveBeenCalled();
  });
});

describe("acaoNoCabecalho", () => {
  function montar(acao?: React.ReactNode) {
    return renderComProviders(
      <Modal titulo="Detalhes" onFechar={vi.fn()} acaoNoCabecalho={acao}>
        <p>corpo</p>
      </Modal>,
    );
  }

  it("renderiza a ação no cabeçalho quando ela existe", () => {
    montar(<button type="button">Adicionar tarefa</button>);

    expect(screen.getByRole("button", { name: "Adicionar tarefa" })).toBeInTheDocument();
  });

  it("sem a prop, o cabeçalho fica só com o X -- nada muda pros outros 10 modais", () => {
    montar();

    const botoes = screen.getAllByRole("button");
    expect(botoes).toHaveLength(1);
    expect(botoes[0]).toHaveAccessibleName("Fechar");
  });

  it("🔴 o X é o ÚLTIMO na ordem do DOM", () => {
    /* Ele é o alvo que as pessoas procuram no canto: inverter a ordem faria
       alguém fechar o modal querendo clicar na ação. */
    montar(<button type="button">Adicionar tarefa</button>);

    const nomes = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(nomes).toEqual(["Adicionar tarefa", "Fechar"]);
  });

  it("🔴 a ação e o X ficam no MESMO grupo, à direita do título", () => {
    /* O `Flex` de fora é `space-between` com dois filhos (título e ações).
       Um terceiro filho direto jogaria a ação pro MEIO do cabeçalho, longe
       do X -- que é o oposto do que foi pedido. */
    montar(<button type="button">Adicionar tarefa</button>);

    const acao = screen.getByRole("button", { name: "Adicionar tarefa" });
    const fechar = screen.getByRole("button", { name: "Fechar" });
    expect(acao.parentElement).toBe(fechar.parentElement);

    const grupo = acao.parentElement!;
    const cabecalho = grupo.parentElement!;
    expect(cabecalho.children).toHaveLength(2);
    expect(cabecalho.lastElementChild).toBe(grupo);
  });
});
