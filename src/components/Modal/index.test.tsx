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
