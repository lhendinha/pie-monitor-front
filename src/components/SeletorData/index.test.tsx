import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import SeletorData from ".";
import Modal from "../Modal";

function montar(valor = "") {
  const onMudar = vi.fn();
  renderComProviders(
    <SeletorData id="data" valor={valor} onMudar={onMudar} placeholder="Qualquer data" />,
  );
  return onMudar;
}

describe("SeletorData", () => {
  it("mostra o placeholder quando não há data", () => {
    montar();
    expect(screen.getByText("Qualquer data")).toBeInTheDocument();
  });

  it("mostra a data em formato brasileiro quando há valor", () => {
    montar("2026-08-21");
    expect(screen.getByText("21/08/2026")).toBeInTheDocument();
  });

  it("devolve a data escolhida em ISO, não no formato do locale", async () => {
    // ⚠️ Este teste existe por um bug que deixava a TELA EM BRANCO: o
    // componente devolvia `valueAsString`, que vem formatado pelo locale
    // ("21/08/2026"). O valor voltava como `valor` no render seguinte, o
    // `parseDate` lançava "Invalid ISO 8601 date string" e derrubava a
    // página inteira. A API também só entende `aaaa-mm-dd`.
    const user = userEvent.setup();
    const onMudar = montar("2026-08-10");

    await user.click(screen.getByText("10/08/2026"));
    // O nome acessível é a data por extenso ("… 21 de agosto de 2026"),
    // não o número da célula.
    const dia = await screen.findByRole("button", { name: /21 de agosto de 2026/i });
    await user.click(dia);

    expect(onMudar).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("o gatilho é type=button -- dentro de form, sem isso viraria submit", () => {
    montar();
    expect(screen.getByText("Qualquer data").closest("button")).toHaveAttribute("type", "button");
  });

  it("expõe o calendário como grade navegável, e não como campo de texto", async () => {
    // O motivo de usar o `DatePicker` do Chakra em vez do calendário
    // caseiro: papéis ARIA de grade e navegação por teclado.
    const user = userEvent.setup();
    montar("2026-08-10");
    await user.click(screen.getByText("10/08/2026"));
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });
});

describe("Escape com o calendário aberto não fecha o que está atrás", () => {
  it("o Escape que fecha o calendário não chega ao modal", async () => {
    /* 🔴 Mesmo defeito dos `Select`, aqui pelo `DatePicker` do Chakra: o
     * `Modal` fecha por um listener de `keydown` no `document`, e o Escape
     * que dispensava o calendário levava o formulário junto -- com o texto
     * já digitado. */
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    renderComProviders(
      <Modal titulo="Formulário" onFechar={aoFechar}>
        <SeletorData id="d" valor="2026-08-21" onMudar={vi.fn()} />
      </Modal>,
    );

    await user.click(screen.getByText("21/08/2026"));
    await screen.findByRole("grid");

    await user.keyboard("{Escape}");

    expect(aoFechar).not.toHaveBeenCalled();
  });
});
