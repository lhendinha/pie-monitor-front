import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";
import MenuDeNovoLancamento from ".";

const onEscolher = vi.fn();

function montar() {
  return renderComProviders(<MenuDeNovoLancamento onEscolher={onEscolher} />);
}

const botao = () => screen.getByRole("button", { name: /Novo lançamento/ });

beforeEach(() => vi.clearAllMocks());

describe("o menu", () => {
  it("começa fechado, e o botão diz isso", () => {
    montar();
    expect(botao()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("🔴 abre com as QUATRO portas, cada uma com a frase que a explica", async () => {
    /* Quatro botões soltos no cabeçalho fariam escolher antes de saber o que
       cada formulário pede -- a frase é o que responde isso. */
    montar();
    await userEvent.click(botao());

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
    expect(screen.getByText("Honorário")).toBeInTheDocument();
    expect(screen.getByText("Outra entrada")).toBeInTheDocument();
    expect(screen.getByText("Saída")).toBeInTheDocument();
    expect(screen.getByText("Transferência")).toBeInTheDocument();
    expect(
      screen.getByText("A receber de um cliente, por processo ou atendimento"),
    ).toBeInTheDocument();
    expect(screen.getByText("Entre duas contas do escritório")).toBeInTheDocument();
  });

  it.each([
    ["Honorário", "honorario"],
    ["Outra entrada", "entrada"],
    ["Saída", "saida"],
    ["Transferência", "transferencia"],
  ])("escolher %s avisa a página com o tipo %s", async (rotulo, forma) => {
    montar();
    await userEvent.click(botao());
    await userEvent.click(await screen.findByText(rotulo));
    expect(onEscolher).toHaveBeenCalledWith(forma);
  });

  it("🔴 FECHA ao escolher", async () => {
    /* Um menu aberto por cima do modal que ele abriu rouba o clique do
       primeiro campo. */
    montar();
    await userEvent.click(botao());
    await userEvent.click(await screen.findByText("Saída"));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("e fecha ao clicar fora", async () => {
    montar();
    await userEvent.click(botao());
    await screen.findByRole("menu");
    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});
