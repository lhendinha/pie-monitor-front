import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components";

const mocks = vi.hoisted(() => ({
  dispararAutenticacaoInvalida: vi.fn(),
}));

vi.mock("./authBridge", () => mocks);

import { ApiError } from "./api";
import { queryClient, toastErroMutation, useToastOnQueryError } from "./queryClient";

function ComponenteDeErro({ erro, mensagem }: { erro: unknown; mensagem: string }) {
  useToastOnQueryError(erro, mensagem);
  return null;
}

afterEach(() => {
  queryClient.clear();
  mocks.dispararAutenticacaoInvalida.mockClear();
});

describe("useToastOnQueryError", () => {
  it("mostra o toast pra erro que não é 401", () => {
    render(
      <ToastProvider>
        <ComponenteDeErro erro={new ApiError("falhou", 500)} mensagem="Não foi possível carregar." />
      </ToastProvider>
    );
    expect(screen.getByText("Não foi possível carregar.")).toBeInTheDocument();
  });

  it("não mostra toast em 401 -- já tratado globalmente", () => {
    render(
      <ToastProvider>
        <ComponenteDeErro erro={new ApiError("expirou", 401)} mensagem="Não foi possível carregar." />
      </ToastProvider>
    );
    expect(screen.queryByText("Não foi possível carregar.")).not.toBeInTheDocument();
  });

  it("não mostra nada quando não há erro", () => {
    render(
      <ToastProvider>
        <ComponenteDeErro erro={null} mensagem="Não foi possível carregar." />
      </ToastProvider>
    );
    expect(screen.queryByText("Não foi possível carregar.")).not.toBeInTheDocument();
  });
});

describe("toastErroMutation", () => {
  it("mostra a mensagem da ApiError quando não é 401", () => {
    const toast = { erro: vi.fn() };
    toastErroMutation(toast, new ApiError("mensagem específica do backend", 403), "mensagem padrão");
    expect(toast.erro).toHaveBeenCalledWith("mensagem específica do backend");
  });

  it("mostra a mensagem padrão quando o erro não é ApiError", () => {
    const toast = { erro: vi.fn() };
    toastErroMutation(toast, new Error("outra coisa"), "mensagem padrão");
    expect(toast.erro).toHaveBeenCalledWith("mensagem padrão");
  });

  it("não mostra nada em 401", () => {
    const toast = { erro: vi.fn() };
    toastErroMutation(toast, new ApiError("expirou", 401), "mensagem padrão");
    expect(toast.erro).not.toHaveBeenCalled();
  });
});

describe("queryClient -- bridge global de 401", () => {
  beforeEach(() => {
    // Silencia o console.error que o React Query loga pra todo erro de
    // query -- já é esperado aqui, faz parte do que o teste força.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("dispara dispararAutenticacaoInvalida quando uma query falha com 401", async () => {
    await queryClient
      .fetchQuery({
        queryKey: ["teste-401"],
        queryFn: () => {
          throw new ApiError("expirou", 401);
        },
      })
      .catch(() => {});

    expect(mocks.dispararAutenticacaoInvalida).toHaveBeenCalledTimes(1);
  });

  it("não dispara em erro que não é 401", async () => {
    await queryClient
      .fetchQuery({
        queryKey: ["teste-500"],
        queryFn: () => {
          throw new ApiError("deu ruim", 500);
        },
        retry: false, // só testando o dispatch do bridge aqui, não a contagem de retry
      })
      .catch(() => {});

    expect(mocks.dispararAutenticacaoInvalida).not.toHaveBeenCalled();
  });

  it("query com 401 não tenta de novo (retry desligado pra esse caso)", async () => {
    const queryFn = vi.fn(() => {
      throw new ApiError("expirou", 401);
    });
    await queryClient.fetchQuery({ queryKey: ["teste-401-retry"], queryFn }).catch(() => {});
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

describe("retry só em erro que pode se resolver sozinho (achado 15)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("erro 4xx (ex: 404) é determinístico -- não tenta de novo", async () => {
    const queryFn = vi.fn(() => {
      throw new ApiError("não encontrado", 404);
    });
    await queryClient.fetchQuery({ queryKey: ["teste-404-retry"], queryFn }).catch(() => {});
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("erro 4xx (ex: 400 de validação) também não tenta de novo", async () => {
    const queryFn = vi.fn(() => {
      throw new ApiError("campo inválido", 400);
    });
    await queryClient.fetchQuery({ queryKey: ["teste-400-retry"], queryFn }).catch(() => {});
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("erro de rede (não é ApiError) continua tentando de novo", async () => {
    let chamadas = 0;
    const queryFn = vi.fn(() => {
      chamadas += 1;
      if (chamadas < 2) throw new TypeError("Failed to fetch");
      return "ok";
    });
    const resultado = await queryClient.fetchQuery({
      queryKey: ["teste-rede-retry"],
      queryFn,
      retryDelay: 0,
    });
    expect(resultado).toBe("ok");
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("erro 5xx continua tentando de novo (pode ser transitório)", async () => {
    let chamadas = 0;
    const queryFn = vi.fn(() => {
      chamadas += 1;
      if (chamadas < 2) throw new ApiError("erro interno", 500);
      return "ok";
    });
    const resultado = await queryClient.fetchQuery({
      queryKey: ["teste-500-retry"],
      queryFn,
      retryDelay: 0,
    });
    expect(resultado).toBe("ok");
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
