import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../test/queryTestUtils";
import { useToast } from "./ToastContext";

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

describe("aviso com Desfazer", () => {
  function GatilhoComDesfazer({ onDesfazer }: { onDesfazer: () => void }) {
    const toast = useToast();
    return (
      <button onClick={() => toast.sucesso("3 tarefas concluídas.", { onDesfazer })}>
        disparar com desfazer
      </button>
    );
  }

  it("🔴 mostra DESFAZER e o X -- e a pílula deixa de ser um botão", async () => {
    /* Com ação, a pílula inteira clicável viraria botão dentro de botão:
       conteúdo interativo aninhado, e o clique ambíguo entre desfazer e
       dispensar. */
    const user = userEvent.setup();
    renderComProviders(<GatilhoComDesfazer onDesfazer={vi.fn()} />);

    await user.click(screen.getByText("disparar com desfazer"));

    expect(screen.getByRole("button", { name: "Desfazer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dispensar aviso" })).toBeInTheDocument();
    expect(screen.getByText("3 tarefas concluídas.").closest("button")).toBeNull();
  });

  it("DESFAZER chama a inversa UMA vez e fecha o aviso", async () => {
    /* Fechar junto é o que impede o segundo clique -- que desfaria o desfazer. */
    const onDesfazer = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<GatilhoComDesfazer onDesfazer={onDesfazer} />);

    await user.click(screen.getByText("disparar com desfazer"));
    await user.click(screen.getByRole("button", { name: "Desfazer" }));

    expect(onDesfazer).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("3 tarefas concluídas.")).not.toBeInTheDocument();
  });

  it("⚠️ o X dispensa SEM desfazer", async () => {
    const onDesfazer = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<GatilhoComDesfazer onDesfazer={onDesfazer} />);

    await user.click(screen.getByText("disparar com desfazer"));
    await user.click(screen.getByRole("button", { name: "Dispensar aviso" }));

    expect(onDesfazer).not.toHaveBeenCalled();
    expect(screen.queryByText("3 tarefas concluídas.")).not.toBeInTheDocument();
  });

  it("🔴 vive 9s, e não os 4,5s de um aviso comum", () => {
    /* O gesto é outro: ler, perceber que errou o alvo e alcançar o botão. */
    vi.useFakeTimers();
    renderComProviders(<GatilhoComDesfazer onDesfazer={vi.fn()} />);

    fireEvent.click(screen.getByText("disparar com desfazer"));
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByText("3 tarefas concluídas.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.queryByText("3 tarefas concluídas.")).not.toBeInTheDocument();
  });

  it("o par: sem Desfazer, o aviso NÃO ganha o botão", async () => {
    const user = userEvent.setup();
    renderComProviders(<Gatilhos />);

    await user.click(screen.getByText("disparar sucesso"));

    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
  });
});
