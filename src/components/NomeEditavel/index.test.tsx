import { screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import NomeEditavel from ".";

function montar(extra: Partial<Parameters<typeof NomeEditavel>[0]> = {}) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  renderComProviders(
    <NomeEditavel
      nome="Cível"
      editando
      podeRenomear
      onIniciar={vi.fn()}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...extra}
    />,
  );
  return { onConfirmar, onCancelar };
}

const campo = () => screen.getByRole("textbox");

describe("NomeEditavel — estado de salvando", () => {
  it("em repouso, o campo é editável", () => {
    montar();
    expect(campo()).not.toHaveAttribute("readonly");
  });

  it("salvando, o campo fica em leitura", async () => {
    // Sem isto, confirmar não mudava NADA na tela: o campo seguia editável,
    // com o texto novo, e a pessoa não sabia se o Enter tinha pegado.
    montar({ salvando: true });
    expect(campo()).toHaveAttribute("readonly");
  });

  it("salvando, sair do campo NÃO reenvia o rename", async () => {
    /* Controle da guarda dentro de `confirmar`.
     *
     * ⚠️ O texto precisa estar ALTERADO. Com o rascunho igual ao nome,
     * `confirmar()` cai no ramo do `onCancelar` e o teste passaria mesmo
     * sem a guarda -- foi o que aconteceu na primeira versão deste arquivo.
     *
     * O harness reproduz o fluxo real em vez de forçar a prop: confirmar É
     * o que inicia o salvamento, então `salvando` vira `true` com o texto
     * novo no campo, e o `onBlur` ainda pendurado tentaria mandar de novo. */
    const user = userEvent.setup();
    const onConfirmar = vi.fn();

    function Harness() {
      const [salvando, setSalvando] = useState(false);
      return (
        <NomeEditavel
          nome="Cível"
          editando
          podeRenomear
          onIniciar={vi.fn()}
          onCancelar={vi.fn()}
          salvando={salvando}
          onConfirmar={(nome) => {
            setSalvando(true);
            onConfirmar(nome);
          }}
        />
      );
    }

    renderComProviders(<Harness />);

    await user.clear(campo());
    await user.type(campo(), "Trabalhista{Enter}");
    expect(onConfirmar).toHaveBeenCalledTimes(1);

    await user.click(campo());
    await user.tab();

    // Continua UMA vez: o blur não somou uma segunda.
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it("sem salvar, Enter confirma normalmente", async () => {
    // Controle dos três acima: sem ele, eles passariam mesmo se o
    // componente tivesse parado de confirmar em qualquer situação.
    const user = userEvent.setup();
    const { onConfirmar } = montar();

    await user.clear(campo());
    await user.type(campo(), "Trabalhista{Enter}");

    expect(onConfirmar).toHaveBeenCalledWith("Trabalhista");
  });

  it("Escape desiste mesmo salvando -- é a saída de quem desistiu", async () => {
    const user = userEvent.setup();
    const { onCancelar } = montar({ salvando: true });

    await user.click(campo());
    await user.keyboard("{Escape}");

    expect(onCancelar).toHaveBeenCalled();
  });
});
