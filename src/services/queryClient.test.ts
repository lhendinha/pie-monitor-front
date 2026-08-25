import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ estaAutenticado: vi.fn(), dispararAutenticacaoInvalida: vi.fn() }));
vi.mock("./auth", () => ({ estaAutenticado: mocks.estaAutenticado }));
vi.mock("./authBridge", () => ({ dispararAutenticacaoInvalida: mocks.dispararAutenticacaoInvalida }));

import { ApiError } from "./api";
import { queryClient } from "./queryClient";

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});

describe("401 só desloga quando a sessão morreu de verdade", () => {
  /**
   * 🔴 `chamar` tenta renovar antes de desistir e, se a renovação falhar,
   * propaga o 401 ORIGINAL. O handler global deslogava por causa do status,
   * mesmo quando a falha tinha sido de REDE e o refresh token seguia válido
   * no servidor -- um segundo de instabilidade custava a sessão inteira.
   *
   * Tirar o `limparTokens()` de dentro do `chamar` não resolveu: o caminho
   * que desloga é o handler.
   *
   * `renovarToken` já distingue -- limpa os tokens quando o SERVIDOR recusa
   * o refresh, não limpa quando a rede caiu. Então "ainda tenho tokens"
   * significa falha transitória.
   */
  async function dispararErro(erro: unknown) {
    await queryClient
      .fetchQuery({ queryKey: ["x"], queryFn: () => Promise.reject(erro), retry: false })
      .catch(() => {});
  }

  it("401 com os tokens ainda presentes NÃO desloga", async () => {
    mocks.estaAutenticado.mockReturnValue(true);
    await dispararErro(new ApiError("Não autenticado", 401));
    expect(mocks.dispararAutenticacaoInvalida).not.toHaveBeenCalled();
  });

  it("401 sem tokens desloga -- o servidor recusou o refresh", async () => {
    mocks.estaAutenticado.mockReturnValue(false);
    await dispararErro(new ApiError("Não autenticado", 401));
    expect(mocks.dispararAutenticacaoInvalida).toHaveBeenCalled();
  });

  it("outros status nunca deslogam", async () => {
    mocks.estaAutenticado.mockReturnValue(false);
    await dispararErro(new ApiError("Conflito", 409));
    expect(mocks.dispararAutenticacaoInvalida).not.toHaveBeenCalled();
  });
});

describe("mensagem de erro de mutation", () => {
  /** 🔴 Depois que `ehSessaoExpirada` passou a exigir "tokens sumiram", o
   * 401 de um `/refresh` que devolveu 502 durante um deploy deixou de ser
   * suprimido -- e virava um toast "Autenticação inválida" pra quem só
   * pegou instabilidade. A sessão continuava de pé. */
  const toastFalso = () => {
    const mensagens: string[] = [];
    return { toast: { erro: (m: string) => mensagens.push(m) }, mensagens };
  };

  it("401 com sessão viva vira mensagem de instabilidade, não 'Autenticação inválida'", async () => {
    const { toastErroMutation } = await import("./queryClient");
    mocks.estaAutenticado.mockReturnValue(true);
    const { toast, mensagens } = toastFalso();

    toastErroMutation(toast, new ApiError("Autenticação inválida", 401), "padrão");

    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]).not.toContain("Autenticação inválida");
    expect(mensagens[0]).toMatch(/sessão|instantes/i);
  });

  it("401 com sessão morta não mostra toast -- o banner cobre", async () => {
    const { toastErroMutation } = await import("./queryClient");
    mocks.estaAutenticado.mockReturnValue(false);
    const { toast, mensagens } = toastFalso();

    toastErroMutation(toast, new ApiError("Autenticação inválida", 401), "padrão");

    expect(mensagens).toEqual([]);
  });

  it("outros erros mostram a mensagem da API", async () => {
    const { toastErroMutation } = await import("./queryClient");
    mocks.estaAutenticado.mockReturnValue(true);
    const { toast, mensagens } = toastFalso();

    toastErroMutation(toast, new ApiError("Nome já existe", 409), "padrão");

    expect(mensagens).toEqual(["Nome já existe"]);
  });
});

describe("leitura e escrita explicam o 401 transitório do mesmo jeito", () => {
  /** 🔴 `toastErroMutation` ganhou o ramo do 401 transitório e
   * `useToastOnQueryError` não -- um 502 no `POST /refresh` fazia a LEITURA
   * dizer "Não foi possível carregar X" enquanto a ESCRITA, na mesma tela,
   * dizia "Não foi possível confirmar sua sessão agora". Duas explicações
   * pro mesmo evento, e a da leitura culpando o recurso errado. */
  it("as duas mensagens coincidem pro mesmo 401 com sessão viva", async () => {
    const { toastErroMutation } = await import("./queryClient");
    mocks.estaAutenticado.mockReturnValue(true);
    const daEscrita: string[] = [];
    toastErroMutation(
      { erro: (m: string) => daEscrita.push(m) },
      new ApiError("Autenticação inválida", 401),
      "Não foi possível salvar.",
    );

    // O hook usa o MESMO classificador; conferir o texto basta.
    expect(daEscrita[0]).toMatch(/sessão/i);
    const fonte = (
      import.meta.glob("./queryClient.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>
    )["./queryClient.ts"];
    const noHook = fonte.slice(fonte.indexOf("useToastOnQueryError"));
    expect(noHook).toContain("ehFalhaTransitoriaDeRenovacao");
  });
});
