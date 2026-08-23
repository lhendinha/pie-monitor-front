import { createRef } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import BotaoDeIcone from "./index";

describe("BotaoDeIcone", () => {
  it("🔴 repassa a ref pro elemento", () => {
    /* Ele é gatilho de `Popover` (o sino). Sem a ref, a lib não tem onde
     * ancorar e IGNORA o `positioning` em silêncio: o painel abre no canto
     * da janela em vez de embaixo do botão. Aconteceu, e só apareceu
     * olhando a tela -- jsdom não mede layout, mas mede isto. */
    const ref = createRef<HTMLButtonElement>();
    renderComProviders(
      <BotaoDeIcone rotulo="Notificações" ref={ref}>
        <span>ícone</span>
      </BotaoDeIcone>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Notificações" }));
  });

  it("sem `comAviso`, o ponto não existe", () => {
    renderComProviders(
      <BotaoDeIcone rotulo="Sino">
        <span>x</span>
      </BotaoDeIcone>,
    );
    expect(screen.getByRole("button").children.length).toBe(1); // só o ícone
  });

  it("com `comAviso`, o ponto aparece ao lado do ícone", () => {
    renderComProviders(
      <BotaoDeIcone rotulo="Sino" comAviso>
        <span>x</span>
      </BotaoDeIcone>,
    );
    expect(screen.getByRole("button").children.length).toBe(2);
  });
});
