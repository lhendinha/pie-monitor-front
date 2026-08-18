import { afterEach, describe, expect, it, vi } from "vitest";
import { dispararAutenticacaoInvalida, setAutenticacaoInvalidaListener } from "./authBridge";

afterEach(() => {
  setAutenticacaoInvalidaListener(null);
});

describe("authBridge", () => {
  it("chama o listener registrado quando dispara", () => {
    const listener = vi.fn();
    setAutenticacaoInvalidaListener(listener);
    dispararAutenticacaoInvalida();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("não quebra se disparar sem listener registrado", () => {
    expect(() => dispararAutenticacaoInvalida()).not.toThrow();
  });

  it("troca de listener -- só o mais recente é chamado", () => {
    const antigo = vi.fn();
    const novo = vi.fn();
    setAutenticacaoInvalidaListener(antigo);
    setAutenticacaoInvalidaListener(novo);
    dispararAutenticacaoInvalida();
    expect(antigo).not.toHaveBeenCalled();
    expect(novo).toHaveBeenCalledTimes(1);
  });

  it("setAutenticacaoInvalidaListener(null) desregistra", () => {
    const listener = vi.fn();
    setAutenticacaoInvalidaListener(listener);
    setAutenticacaoInvalidaListener(null);
    dispararAutenticacaoInvalida();
    expect(listener).not.toHaveBeenCalled();
  });
});
