import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";
import { useToast } from "./index";

function Gatilhos() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.erro("Deu errado")}>disparar erro</button>
      <button onClick={() => toast.sucesso("Deu certo")}>disparar sucesso</button>
    </>
  );
}

afterEach(() => {
  // Rede de segurança -- se um teste com fake timers falhar antes de
  // restaurar, isso evita vazar pros testes seguintes (comportamento real
  // já visto: sem isso, uma falha aqui trava os testes depois em timeout).
  vi.useRealTimers();
});

describe("useToast fora de ToastProvider", () => {
  it("lança um erro explicativo", () => {
    // Suprime o console.error do React sobre o erro não capturado no render.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function SemProvider() {
      useToast();
      return null;
    }
    expect(() => render(<SemProvider />)).toThrow("useToast precisa estar dentro de <ToastProvider>");
    spy.mockRestore();
  });
});

describe("ToastProvider", () => {
  it("mostra a mensagem de erro/sucesso disparada", async () => {
    const user = userEvent.setup();
    renderComProviders(<Gatilhos />);

    await user.click(screen.getByText("disparar erro"));
    expect(screen.getByText("Deu errado")).toBeInTheDocument();

    await user.click(screen.getByText("disparar sucesso"));
    expect(screen.getByText("Deu certo")).toBeInTheDocument();
  });

  it("marca o tipo do aviso -- erro e sucesso não se confundem", async () => {
    // O que separa os dois na tela é o ÍCONE (triângulo vermelho x tique
    // verde), e ícone decorativo não aparece pro teste. O `data-tipo` é o
    // nome desse estado.
    const user = userEvent.setup();
    renderComProviders(<Gatilhos />);

    await user.click(screen.getByText("disparar erro"));
    expect(screen.getByText("Deu errado")).toHaveAttribute("data-tipo", "erro");

    await user.click(screen.getByText("disparar sucesso"));
    expect(screen.getByText("Deu certo")).toHaveAttribute("data-tipo", "sucesso");
  });

  it("some sozinho depois de 4.5s", () => {
    vi.useFakeTimers();
    renderComProviders(<Gatilhos />);

    fireEvent.click(screen.getByText("disparar erro"));
    expect(screen.getByText("Deu errado")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByText("Deu errado")).not.toBeInTheDocument();
  });

  it("clicar no toast remove ele antes do tempo", () => {
    renderComProviders(<Gatilhos />);

    fireEvent.click(screen.getByText("disparar erro"));
    fireEvent.click(screen.getByText("Deu errado"));
    expect(screen.queryByText("Deu errado")).not.toBeInTheDocument();
  });

  it("várias mensagens acumulam ao mesmo tempo", () => {
    renderComProviders(<Gatilhos />);

    fireEvent.click(screen.getByText("disparar erro"));
    fireEvent.click(screen.getByText("disparar sucesso"));
    expect(screen.getByText("Deu errado")).toBeInTheDocument();
    expect(screen.getByText("Deu certo")).toBeInTheDocument();
  });
});
