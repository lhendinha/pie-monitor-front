import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  renovarToken: vi.fn(),
  tokenVenceEm: vi.fn(),
}));

/** Guarda o que foi passado ao `ReconnectingWebSocket` -- é o que estes
 * testes precisam inspecionar, já que a URL agora é uma FUNÇÃO. */
const criados = vi.hoisted(() => [] as { url: unknown; fechado: boolean }[]);

vi.mock("../services/auth", () => mocks);
vi.mock("reconnecting-websocket", () => ({
  default: class {
    readyState = 1;
    OPEN = 1;
    constructor(url: unknown) {
      criados.push({ url, fechado: false });
    }
    addEventListener() {}
    send() {}
    close() {
      criados[criados.length - 1].fechado = true;
    }
  },
}));

import { useCanalDeNotificacoes } from "./useCanalDeNotificacoes";

beforeEach(() => {
  vi.clearAllMocks();
  criados.length = 0;
  vi.stubEnv("VITE_WS_URL", "wss://exemplo/prod");
  mocks.getAccessToken.mockReturnValue("token-valido");
  mocks.tokenVenceEm.mockReturnValue(false);
  mocks.renovarToken.mockResolvedValue(true);
});

afterEach(() => vi.unstubAllEnvs());

describe("quando NÃO abre", () => {
  it("sem sessão", () => {
    mocks.getAccessToken.mockReturnValue(null);
    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    expect(criados).toHaveLength(0);
  });

  it("sem `VITE_WS_URL` -- o sino segue pela consulta", () => {
    vi.stubEnv("VITE_WS_URL", "");
    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    expect(criados).toHaveLength(0);
  });
});

describe("o token não fica congelado", () => {
  it("🔴 a URL é uma FUNÇÃO, recalculada a cada tentativa", async () => {
    /* Era a limitação: o token era lido na abertura e congelava. Quando
     * vencia, a reconexão levava o token morto, tomava 401 e o canal
     * desistia -- perdia-se o tempo real até um F5. */
    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    expect(typeof criados[0].url).toBe("function");
  });

  it("pega o token ATUAL, não o de quando abriu", async () => {
    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    const montar = criados[0].url as () => Promise<string>;

    mocks.getAccessToken.mockReturnValue("token-renovado");
    await expect(montar()).resolves.toContain("token-renovado");
  });

  it("RENOVA antes de abrir quando o token está pra vencer", async () => {
    mocks.tokenVenceEm.mockReturnValue(true);
    mocks.getAccessToken.mockReturnValueOnce("token-velho").mockReturnValue("token-novo");

    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    const url = await (criados[0].url as () => Promise<string>)();

    expect(mocks.renovarToken).toHaveBeenCalled();
    expect(url).toContain("token-novo");
  });

  it("NÃO renova à toa quando o token está bom", async () => {
    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    await (criados[0].url as () => Promise<string>)();
    expect(mocks.renovarToken).not.toHaveBeenCalled();
  });

  it("renovação que falha não impede a tentativa", async () => {
    /* Quem decide é o handshake. Insistir aqui atrasaria a reconexão sem
     * melhorar nada. */
    mocks.tokenVenceEm.mockReturnValue(true);
    mocks.renovarToken.mockRejectedValue(new Error("rede caiu"));

    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    await expect((criados[0].url as () => Promise<string>)()).resolves.toContain("token-valido");
  });

  it("o token vai CODIFICADO na query", async () => {
    mocks.getAccessToken.mockReturnValue("com/barra+e=sinal");
    renderHook(() => useCanalDeNotificacoes(vi.fn()));
    const url = await (criados[0].url as () => Promise<string>)();
    expect(url).toContain("com%2Fbarra%2Be%3Dsinal");
  });
});

describe("limpeza", () => {
  it("fecha a conexão ao desmontar", () => {
    const { unmount } = renderHook(() => useCanalDeNotificacoes(vi.fn()));
    unmount();
    expect(criados[0].fechado).toBe(true);
  });

  it("NÃO reabre a cada render", async () => {
    /* `aoChegar` é recriada a cada render de quem chama. Se entrasse nas
     * dependências, a conexão reabriria sem parar. */
    const { rerender } = renderHook(() => useCanalDeNotificacoes(vi.fn()));
    rerender();
    rerender();
    await waitFor(() => expect(criados).toHaveLength(1));
  });
});
