import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./index";

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
    render(
      <ToastProvider>
        <Gatilhos />
      </ToastProvider>
    );

    await user.click(screen.getByText("disparar erro"));
    expect(screen.getByText("Deu errado")).toBeInTheDocument();

    await user.click(screen.getByText("disparar sucesso"));
    expect(screen.getByText("Deu certo")).toBeInTheDocument();
  });

  it("aplica a classe certa por tipo (erro/sucesso)", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Gatilhos />
      </ToastProvider>
    );

    await user.click(screen.getByText("disparar erro"));
    expect(screen.getByText("Deu errado")).toHaveClass("toast-erro");
  });

  it("some sozinho depois de 4.5s", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Gatilhos />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("disparar erro"));
    expect(screen.getByText("Deu errado")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByText("Deu errado")).not.toBeInTheDocument();
  });

  it("clicar no toast remove ele antes do tempo", () => {
    render(
      <ToastProvider>
        <Gatilhos />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("disparar erro"));
    fireEvent.click(screen.getByText("Deu errado"));
    expect(screen.queryByText("Deu errado")).not.toBeInTheDocument();
  });

  it("várias mensagens acumulam ao mesmo tempo", () => {
    render(
      <ToastProvider>
        <Gatilhos />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("disparar erro"));
    fireEvent.click(screen.getByText("disparar sucesso"));
    expect(screen.getByText("Deu errado")).toBeInTheDocument();
    expect(screen.getByText("Deu certo")).toBeInTheDocument();
  });
});
