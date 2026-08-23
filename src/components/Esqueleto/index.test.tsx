import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import Esqueleto from "./index";

describe("Esqueleto", () => {
  it("desenha uma barra por linha pedida", () => {
    const { container } = renderComProviders(<Esqueleto linhas={4} />);

    expect(container.querySelectorAll(".chakra-skeleton")).toHaveLength(4);
  });

  it("três linhas por padrão -- o suficiente pra sugerir uma tabela", () => {
    const { container } = renderComProviders(<Esqueleto />);

    expect(container.querySelectorAll(".chakra-skeleton")).toHaveLength(3);
  });

  it("as barras ficam fora do leitor de tela -- são forma, não conteúdo", () => {
    const { container } = renderComProviders(<Esqueleto />);

    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("mas ANUNCIA que está carregando, em texto invisível", () => {
    /* As telas diziam "carregando…" por escrito, e era isso que justificava
     * o `aria-hidden` das barras. A frase saiu por ser redundante COM o
     * esqueleto -- redundante pra quem enxerga, única fonte pra quem não.
     * Sem esta linha, tirar o texto teria trocado ruído visual por silêncio
     * total. Fica vermelho se alguém remover o anúncio. */
    renderComProviders(<Esqueleto />);

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });
});
