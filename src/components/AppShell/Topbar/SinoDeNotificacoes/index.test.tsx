import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarNotificacoes: vi.fn(),
  marcarNotificacaoLida: vi.fn(),
  marcarTodasLidas: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
  papelAtende: vi.fn(),
  getAccessToken: vi.fn(),
  /* ⚠️ Entrou quando a linha passou a mostrar o subgrupo. É a terceira vez
     nesta frente que faltar este mock transformaria o catálogo numa chamada
     de rede DENTRO da suíte -- por isso agora eu confiro antes de escrever. */
  listarSubgrupos: vi.fn(),
}));
const navegou = vi.hoisted(() => vi.fn());

vi.mock("../../../../services", () => mocks);
vi.mock("../../../../services/auth", () => mocks);
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navegou,
}));

import SinoDeNotificacoes from "./index";

function notificacao(parcial: Record<string, unknown> = {}) {
  return {
    usuario_id: "eu@x.com",
    notificacao_id: "1787000000000000_abc",
    tipo: "tarefa_atribuida",
    criado_em: "2026-08-23T14:30:00+00:00",
    lida: false,
    autor: "ana@x.com",
    /* 🔴 O nome vem NA notificação desde 25/08/2026, resolvido pelo servidor.
       Antes, este teste montava a frase mockando `listarTodosOsMembrosDoGrupo`
       -- e era exatamente esse caminho que deixava quem é `user` sem nome,
       porque a consulta real tinha `enabled: papelAtende("manager")`. */
    autor_nome: "Ana Paula",
    titulo: "Protocolar contestação",
    detalhe: "",
    subgrupo_id: "s1",
    alvo_tipo: "tarefa",
    alvo_id: "t1",
    ...parcial,
  };
}

function comSino(lista: Record<string, unknown>[], naoLidas?: number) {
  mocks.listarNotificacoes.mockResolvedValue({
    notificacoes: lista,
    nao_lidas: naoLidas ?? lista.filter((n) => !n.lida).length,
    limite: 50,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  // Sem token, o hook do canal nem tenta abrir WebSocket -- é o que deixa
  // estes testes rodarem em jsdom sem stub de rede.
  mocks.getAccessToken.mockReturnValue(null);
  mocks.marcarNotificacaoLida.mockResolvedValue({});
  mocks.marcarTodasLidas.mockResolvedValue({});
  comSino([]);
});

const sino = () => screen.getByRole("button", { name: "Notificações" });

async function abrirPainel() {
  renderComProviders(<SinoDeNotificacoes />);
  await userEvent.click(sino());
  return await screen.findByText("Notificações", { selector: "p, span, div" });
}

describe("o aviso no sino", () => {
  it("🔴 NÃO acende quando não há nada não lido", async () => {
    /* O artifact traz o ponto sempre aceso e o sino era inerte. Um aviso
     * permanente que não avisa nada treina a pessoa a ignorá-lo. */
    comSino([notificacao({ lida: true })]);
    renderComProviders(<SinoDeNotificacoes />);
    await waitFor(() => expect(mocks.listarNotificacoes).toHaveBeenCalled());

    expect(sino().querySelector("[data-aviso]")).toBeNull();
    // o ponto é um Box sem texto -- conferimos pela contagem de filhos
    await waitFor(() => expect(sino().children.length).toBe(1));
  });

  it("acende quando há não lidas", async () => {
    comSino([notificacao()]);
    renderComProviders(<SinoDeNotificacoes />);
    await waitFor(() => expect(sino().children.length).toBe(2));
  });
});

describe("painel", () => {
  it("mostra a frase montada com o APELIDO de quem agiu", async () => {
    comSino([notificacao()]);
    await abrirPainel();
    expect(await screen.findByText("Ana Paula atribuiu uma tarefa a você")).toBeInTheDocument();
  });

  it("cai no e-mail quando o apelido não existe", async () => {
    /* `autor_nome` ausente cobre dois casos reais: quem nunca definiu
       apelido, e autor de OUTRO grupo (um `super_admin` agindo fora do dele,
       que o filtro por `grupo_id` do servidor não resolve). Nos dois, o
       e-mail ainda identifica. */
    comSino([notificacao({ autor_nome: null })]);
    await abrirPainel();
    expect(await screen.findByText("ana@x.com atribuiu uma tarefa a você")).toBeInTheDocument();
  });

  it("o lembrete NÃO inventa sujeito -- não houve pessoa agindo", async () => {
    comSino([
      notificacao({ tipo: "lembrete", autor: "", detalhe: "Vence hoje", titulo: "Tarefa: Protocolar" }),
    ]);
    await abrirPainel();
    expect(await screen.findByText("Vence hoje")).toBeInTheDocument();
    expect(screen.queryByText(/Alguém|undefined/)).not.toBeInTheDocument();
  });

  it("tipo DESCONHECIDO mostra o título cru em vez de sumir", async () => {
    /* Um front mais antigo que o servidor vai encontrar tipos que não
     * conhece. Esconder seria a pior reação: a pessoa não saberia que o
     * aviso existe. */
    comSino([notificacao({ tipo: "algo_que_nao_existe_ainda", titulo: "Aviso novo" })]);
    await abrirPainel();
    expect((await screen.findAllByText("Aviso novo")).length).toBeGreaterThan(0);
  });

  it("vazio diz que está vazio", async () => {
    await abrirPainel();
    expect(await screen.findByText("Nenhuma notificação.")).toBeInTheDocument();
  });
});

describe("abrir uma notificação", () => {
  it("marca como lida e navega pro alvo", async () => {
    comSino([notificacao()]);
    await abrirPainel();
    await userEvent.click(await screen.findByText("Ana Paula atribuiu uma tarefa a você"));

    expect(mocks.marcarNotificacaoLida).toHaveBeenCalledWith("1787000000000000_abc");
    expect(navegou).toHaveBeenCalledWith("/tarefas/s1/t1");
  });

  it("já lida NÃO chama marcar de novo", async () => {
    comSino([notificacao({ lida: true })]);
    await abrirPainel();
    await userEvent.click(await screen.findByText("Ana Paula atribuiu uma tarefa a você"));

    expect(mocks.marcarNotificacaoLida).not.toHaveBeenCalled();
    expect(navegou).toHaveBeenCalled();
  });

  it("🔴 sem alvo, a linha NÃO é clicável", async () => {
    /* Levar a lugar nenhum é pior que não levar: a pessoa clica, nada
     * acontece, e ela conclui que o sistema travou. */
    comSino([notificacao({ alvo_tipo: "", alvo_id: "" })]);
    await abrirPainel();

    const linha = (await screen.findByText("Ana Paula atribuiu uma tarefa a você")).closest("button");
    expect(linha).toBeDisabled();
  });

  it("o destino segue o ALVO, não o tipo", async () => {
    // O mesmo `lembrete` aponta ora pra tarefa, ora pra processo.
    comSino([
      notificacao({
        tipo: "lembrete", autor: "", alvo_tipo: "processo",
        alvo_id: "00001234520248130001", detalhe: "Prazo final é amanhã",
      }),
    ]);
    await abrirPainel();
    await userEvent.click(await screen.findByText("Prazo final é amanhã"));

    expect(navegou).toHaveBeenCalledWith("/processos/s1/00001234520248130001");
  });
});

describe("marcar todas", () => {
  it("aparece só quando há não lidas", async () => {
    comSino([notificacao({ lida: true })]);
    await abrirPainel();
    expect(
      screen.queryByRole("button", { name: /Marcar todas/ }),
    ).not.toBeInTheDocument();
  });

  it("chama o servidor", async () => {
    comSino([notificacao()]);
    await abrirPainel();
    await userEvent.click(screen.getByRole("button", { name: /Marcar todas como lidas/ }));
    expect(mocks.marcarTodasLidas).toHaveBeenCalled();
  });
});

describe("erro", () => {
  it("oferece tentar de novo", async () => {
    mocks.listarNotificacoes.mockRejectedValue(new Error("caiu"));
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());
    expect(
      await screen.findByRole("button", { name: /Tentar de novo/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
  });
});

describe("o subgrupo na notificação", () => {
  it("🔴 mostra de qual subgrupo veio o aviso", async () => {
    /* O sino junta tudo que acontece nos seus subgrupos. "Fulano atribuiu uma
       tarefa a você" não diz de onde ela vem -- e quem participa de vários
       precisa saber antes de abrir.

       ⚠️ A etiqueta fica ao lado da DATA, e fora do `Text` dela: aquele é
       `fontFamily mono`, e herdar mono deixaria esta etiqueta diferente das
       outras seis telas. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
    });
    comSino([notificacao()]);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    expect(await screen.findByTitle("Cível")).toHaveTextContent("Cível");
  });

  it("⚠️ o par negativo: sem o subgrupo no catálogo, mostra o id -- e não some", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
    comSino([notificacao()]);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    expect(await screen.findByTitle("s1")).toHaveTextContent("s1");
  });
});
