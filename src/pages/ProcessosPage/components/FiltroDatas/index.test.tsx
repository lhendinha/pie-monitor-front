import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";
import FiltroDatas from ".";

function montar(dataVerificarAte = "", prazoFinalAte = "") {
  const onMudar = vi.fn();
  renderComProviders(
    <FiltroDatas
      dataVerificarAte={dataVerificarAte}
      prazoFinalAte={prazoFinalAte}
      onMudar={onMudar}
    />,
  );
  return onMudar;
}

/** A pílula, pelo atributo do Popover: por texto ela colide com o botão
 * "Limpar datas" de dentro do painel. */
function chip() {
  return document.querySelector<HTMLElement>('[data-scope="popover"][data-part="trigger"]')!;
}

describe("FiltroDatas", () => {
  it("o chip conta as datas ativas em vez de mostrá-las", () => {
    montar("2026-08-21", "2026-09-01");
    expect(screen.getByRole("button", { name: /2 datas/i })).toBeInTheDocument();
  });

  it("sem data escolhida o chip diz 'Datas'", () => {
    montar();
    expect(screen.getByRole("button", { name: /^datas/i })).toBeInTheDocument();
  });

  it("abre com os dois campos e o rodapé do artifact", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(chip());

    expect(await screen.findByText("Data p/ verificar (até)")).toBeInTheDocument();
    expect(screen.getByText("Prazo final (até)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar datas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
  });

  it("escolher um dia não filtra sozinho -- só o Aplicar vale", async () => {
    // Sem o rascunho, escolher as duas datas dispararia duas buscas, e a
    // primeira com um filtro que a pessoa nem terminou de montar.
    const user = userEvent.setup();
    const onMudar = montar("2026-08-10");

    await user.click(chip());
    await user.click(await screen.findByText("10/08/2026"));
    await user.click(await screen.findByRole("button", { name: /21 de agosto de 2026/i }));

    expect(onMudar).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onMudar).toHaveBeenCalledWith({
      dataVerificarAte: "2026-08-21",
      prazoFinalAte: "",
    });
  });

  it("escolher um dia mantém o painel aberto", async () => {
    // ⚠️ O calendário é portalado, então o clique num dia chegava ao
    // Popover como "clique fora" e derrubava o painel antes de dar pra
    // clicar em Aplicar.
    const user = userEvent.setup();
    montar("2026-08-10");

    await user.click(chip());
    await user.click(await screen.findByText("10/08/2026"));
    await user.click(await screen.findByRole("button", { name: /21 de agosto de 2026/i }));

    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
  });

  it("o calendário fechado sai do DOM -- fechado, ele engolia cliques", async () => {
    // ⚠️ Enquanto ficava montado, o posicionador do calendário cobria a
    // tela e o campo de baixo virava inclicável: o painel parecia não
    // responder a clique nenhum.
    const user = userEvent.setup();
    montar();

    await user.click(chip());
    expect(document.querySelectorAll('[data-scope="date-picker"][data-part="content"]')).toHaveLength(
      0,
    );

    await user.click(await screen.findAllByText("Qualquer data").then((n) => n[0]));
    expect(
      document.querySelectorAll('[data-scope="date-picker"][data-part="content"]').length,
    ).toBe(1);
  });

  it("só um calendário fica aberto -- abrir um fecha o outro", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(chip());
    const campos = await screen.findAllByText("Qualquer data");
    await user.click(campos[0]);
    await user.click(campos[1]);

    expect(
      document.querySelectorAll('[data-scope="date-picker"][data-part="content"]').length,
    ).toBe(1);
  });

  it("'Limpar datas' zera as duas de uma vez", async () => {
    const user = userEvent.setup();
    const onMudar = montar("2026-08-21", "2026-09-01");

    await user.click(chip());
    await user.click(await screen.findByRole("button", { name: "Limpar datas" }));

    expect(onMudar).toHaveBeenCalledWith({ dataVerificarAte: "", prazoFinalAte: "" });
  });

  it("fechar sem aplicar descarta o rascunho", async () => {
    const user = userEvent.setup();
    const onMudar = montar("2026-08-10");

    await user.click(chip());
    await user.click(await screen.findByText("10/08/2026"));
    await user.click(await screen.findByRole("button", { name: /21 de agosto de 2026/i }));
    await user.keyboard("{Escape}");
    await user.keyboard("{Escape}");

    expect(onMudar).not.toHaveBeenCalled();

    // Reabrir mostra de novo o que está APLICADO, não o que foi descartado.
    await user.click(chip());
    expect(await screen.findByText("10/08/2026")).toBeInTheDocument();
  });
});
