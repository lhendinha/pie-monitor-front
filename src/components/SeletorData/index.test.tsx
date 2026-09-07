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

  /* ⚠️ Estes dois provam que a vista TROCA e que a escolha volta em ISO.
     O que eles NÃO alcançam é se a vista velha SOME: o jsdom lê o atributo
     `hidden` (que está correto) e não computa folha de estilo -- e era o
     `display: flex` da receita do Chakra que ganhava do `hidden`, deixando
     as três empilhadas. Isso é `scripts/verificar-seletor-de-data.mjs`. */
  it("🔴 clicar no mês/ano do cabeçalho abre a vista de MESES, sem quebrar", async () => {
    /* O cabeçalho é um botão (`ViewTrigger`) e promete trocar de vista. Só a
       vista de DIA existia: clicar levava a máquina para `view="month"`, o
       Chakra formatava uma data não-finita e a tela caía com
       `RangeError: date value is not finite in DateTimeFormat format()`.
       Achado pelo usuário no modal de conta do Financeiro, mas o defeito é
       deste componente -- vale para toda tela que tem campo de data. */
    const user = userEvent.setup();
    montar("2026-08-10");
    await user.click(screen.getByText("10/08/2026"));
    await user.click(await screen.findByRole("button", { name: "Escolher o mês" }));

    /* ⚠️ Por TEXTO, e em minúscula: as células são `div` com papel de grade,
       como as de dia, e o pt-BR nomeia mês em minúscula -- a maiúscula da
       tela é `::first-letter`, que não muda o texto. */
    expect(await screen.findByText("agosto")).toBeInTheDocument();
    expect(screen.getByText("janeiro")).toBeInTheDocument();
  });

  it("e dali dá para chegar nos ANOS, e voltar escolhendo", async () => {
    const user = userEvent.setup();
    const onMudar = montar("2026-08-10");
    await user.click(screen.getByText("10/08/2026"));
    await user.click(await screen.findByRole("button", { name: "Escolher o mês" }));
    await user.click(await screen.findByRole("button", { name: "Escolher o ano" }));

    // A vista de anos mostra a década inteira -- o intervalo aparece no
    // cabeçalho e no rótulo da vista, daí o `getAllByText`.
    expect((await screen.findAllByText("2020 - 2029")).length).toBeGreaterThan(0);
    await user.click(screen.getByText("2024"));
    // Escolher o ano volta para os meses, e escolher o mês volta para os dias.
    await user.click(await screen.findByText("março"));
    /* Pelo rótulo do dia, e não pelo texto "5": "5" casa com "15" e "25". E
       de quebra o rótulo prova a tradução -- era "Choose ..." em inglês. */
    await user.click((await screen.findAllByLabelText(/Escolher.*5 de março de 2024/))[0]);
    expect(onMudar).toHaveBeenCalledWith("2024-03-05");
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
      <Modal titulo="Formulário" onFechar={aoFechar} descarte="semFormulario">
        <SeletorData id="d" valor="2026-08-21" onMudar={vi.fn()} />
      </Modal>,
    );

    await user.click(screen.getByText("21/08/2026"));
    await screen.findByRole("grid");

    await user.keyboard("{Escape}");

    expect(aoFechar).not.toHaveBeenCalled();
  });
});
