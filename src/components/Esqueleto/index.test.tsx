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

  it("fica fora do leitor de tela -- é forma, não conteúdo", () => {
    const { container } = renderComProviders(<Esqueleto />);

    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
