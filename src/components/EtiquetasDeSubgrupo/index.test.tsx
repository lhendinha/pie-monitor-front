import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import EtiquetasDeSubgrupo from "./index";

const TRES = ["Cível", "Trabalhista", "Ângela e Associados"];

describe("EtiquetasDeSubgrupo", () => {
  it("sem nenhum, mostra o travessão -- e não a célula vazia", () => {
    /* Numa coluna com nome, vazio se lê como dado que faltou, não como
       "nada a declarar". */
    renderComProviders(<EtiquetasDeSubgrupo nomes={[]} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it.each([[["Cível"]], [["Cível", "Trabalhista"]]])(
    "até DOIS, mostra os nomes: %s",
    (nomes) => {
      renderComProviders(<EtiquetasDeSubgrupo nomes={nomes} />);

      for (const nome of nomes) expect(screen.getByText(nome)).toBeInTheDocument();
      expect(screen.queryByText(/subgrupos$/)).not.toBeInTheDocument();
    },
  );

  it("🔴 de TRÊS em diante, mostra a contagem no lugar dos nomes", () => {
    /* O motivo é a ALTURA DA LINHA: vinte etiquetas quebram em quatro
       fileiras, a linha da tabela cresce, as vizinhas não, e as colunas
       descolam do que descrevem.

       ⚠️ A segunda metade é o par negativo: sem ela, uma implementação que
       mostrasse a contagem E os nomes passaria. */
    renderComProviders(<EtiquetasDeSubgrupo nomes={TRES} />);

    expect(screen.getByText("3 subgrupos")).toBeInTheDocument();
    for (const nome of TRES) expect(screen.queryByText(nome)).not.toBeInTheDocument();
  });

  it("⚠️ o `title` guarda a lista INTEIRA -- o que a célula resume, o ponteiro devolve", () => {
    renderComProviders(<EtiquetasDeSubgrupo nomes={TRES} />);

    expect(screen.getByTitle(TRES.join(", "))).toBeInTheDocument();
  });
});
