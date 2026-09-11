import { screen, waitFor, within } from "@testing-library/react";
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
import {
  ESTADO_DO_ALVO_DISPONIVEL,
  ESTADO_DO_ALVO_EXCLUIDO,
  ESTADO_DO_ALVO_SEM_ACESSO,
  MARCA_DO_ALVO,
} from "../../../../constants/notificacoes";

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

describe("🔴 a linha cujo item não existe mais", () => {
  const FRASE = "Ana Paula atribuiu uma tarefa a você";

  it("clicar numa morta NÃO lida só a marca como lida -- sem navegar e sem fechar o painel", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO })]);
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));

    expect(mocks.marcarNotificacaoLida).toHaveBeenCalledWith("1787000000000000_abc");
    expect(navegou).not.toHaveBeenCalled();
    expect(screen.getByText(FRASE)).toBeInTheDocument();
  });

  it("a morta JÁ lida não chama nada", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO, lida: true })]);
    await abrirPainel();
    const linha = (await screen.findByText(FRASE)).closest("button");
    /* 🔴 Habilitada MESMO lida: desabilitar tiraria a linha do teclado -- e o
       texto do aviso continua sendo informação. */
    expect(linha).not.toBeDisabled();
    await userEvent.click(linha!);

    expect(mocks.marcarNotificacaoLida).not.toHaveBeenCalled();
    expect(navegou).not.toHaveBeenCalled();
  });

  it("sem acesso tem o MESMO clique: só marca lida", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_SEM_ACESSO })]);
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));

    expect(mocks.marcarNotificacaoLida).toHaveBeenCalled();
    expect(navegou).not.toHaveBeenCalled();
  });

  it("a marca é TEXTO, e diferente para cada estado", async () => {
    comSino([
      notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO }),
      notificacao({ notificacao_id: "1787000000000001_def", alvo_estado: ESTADO_DO_ALVO_SEM_ACESSO }),
    ]);
    await abrirPainel();

    expect(await screen.findByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_EXCLUIDO])).toBeInTheDocument();
    expect(screen.getByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_SEM_ACESSO])).toBeInTheDocument();
  });

  it("🔴 a morta continua botão HABILITADO -- alcançável pelo teclado e pelo leitor de tela", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO })]);
    await abrirPainel();

    expect((await screen.findByText(FRASE)).closest("button")).not.toBeDisabled();
  });

  it("par negativo: disponível abre como sempre, sem marca", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_DISPONIVEL })]);
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));

    expect(navegou).toHaveBeenCalledWith("/tarefas/s1/t1");
    expect(screen.queryByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_EXCLUIDO])).not.toBeInTheDocument();
  });

  it("valor DESCONHECIDO abre como sempre -- front antigo não esconde linha viva", async () => {
    comSino([notificacao({ alvo_estado: "algo_que_nao_existe_ainda" })]);
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));

    expect(navegou).toHaveBeenCalledWith("/tarefas/s1/t1");
  });

  it("⚠️ se marcar lida FALHAR: continua não lida, sem navegar e com o painel aberto", async () => {
    /* O hook não mostra toast (marcar lida é consequência, não pedido) e
       recarrega a lista quando termina. Falhou, a linha segue contando -- que é
       o estado verdadeiro -- e nada leva a pessoa para fora do painel. */
    mocks.marcarNotificacaoLida.mockRejectedValue(new Error("caiu"));
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO })]);
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));

    await waitFor(() => expect(mocks.listarNotificacoes).toHaveBeenCalledTimes(2));
    expect(navegou).not.toHaveBeenCalled();
    expect(screen.getByText(FRASE)).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("🔴 depois de lida pelo clique, o segundo clique já não chama nada", async () => {
    /* O painel fica ABERTO na morta, então o segundo clique acontece de verdade.
       É a volta da lista recarregada que diz que ela foi lida. */
    mocks.listarNotificacoes
      .mockResolvedValueOnce({ notificacoes: [notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO })], nao_lidas: 1, limite: 50 })
      .mockResolvedValue({ notificacoes: [notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO, lida: true })], nao_lidas: 0, limite: 50 });
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));
    await waitFor(() => expect(screen.queryByText("(1)")).not.toBeInTheDocument());

    await userEvent.click(screen.getByText(FRASE));
    expect(mocks.marcarNotificacaoLida).toHaveBeenCalledTimes(1);
    expect(navegou).not.toHaveBeenCalled();
  });

  it("pelo TECLADO: Enter na morta marca lida, sem navegar", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_SEM_ACESSO })]);
    await abrirPainel();
    (await screen.findByText(FRASE)).closest("button")!.focus();
    await userEvent.keyboard("{Enter}");

    expect(mocks.marcarNotificacaoLida).toHaveBeenCalledWith("1787000000000000_abc");
    expect(navegou).not.toHaveBeenCalled();
  });

  it("sem acesso JÁ lida também não chama nada -- e segue habilitada", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_SEM_ACESSO, lida: true })]);
    await abrirPainel();
    const linha = (await screen.findByText(FRASE)).closest("button");
    expect(linha).not.toBeDisabled();
    await userEvent.click(linha!);

    expect(mocks.marcarNotificacaoLida).not.toHaveBeenCalled();
    expect(navegou).not.toHaveBeenCalled();
  });

  it("⚠️ morta SEM destino ainda marca lida -- senão contaria no sino para sempre", async () => {
    /* A API não manda estado sem alvo (decisão 2 do plano), mas o front não pode
       depender disso: sem destino, a linha viva fica sem clique, e a morta
       precisa do clique para sair da contagem. */
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO, alvo_tipo: "", alvo_id: "" })]);
    await abrirPainel();
    const linha = (await screen.findByText(FRASE)).closest("button");
    expect(linha).not.toBeDisabled();
    await userEvent.click(linha!);

    expect(mocks.marcarNotificacaoLida).toHaveBeenCalledWith("1787000000000000_abc");
    expect(navegou).not.toHaveBeenCalled();
  });

  it("🔴 cada linha leva a SUA marca e o SEU ícone -- não trocados", async () => {
    comSino([
      notificacao({ titulo: "Tarefa apagada", alvo_estado: ESTADO_DO_ALVO_EXCLUIDO }),
      notificacao({ notificacao_id: "1787000000000001_def", titulo: "Tarefa trancada", alvo_estado: ESTADO_DO_ALVO_SEM_ACESSO }),
    ]);
    await abrirPainel();
    const apagada = (await screen.findByText("Tarefa apagada")).closest("button")!;
    const trancada = screen.getByText("Tarefa trancada").closest("button")!;

    const marcaApagada = within(apagada).getByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_EXCLUIDO]);
    const marcaTrancada = within(trancada).getByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_SEM_ACESSO]);
    expect(within(apagada).queryByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_SEM_ACESSO])).not.toBeInTheDocument();
    expect(within(trancada).queryByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_EXCLUIDO])).not.toBeInTheDocument();

    const iconeApagada = marcaApagada.parentElement!.querySelector("svg");
    const iconeTrancada = marcaTrancada.parentElement!.querySelector("svg");
    expect(iconeApagada).not.toBeNull();
    expect(iconeTrancada).not.toBeNull();
    expect(iconeApagada!.innerHTML).not.toBe(iconeTrancada!.innerHTML);
  });

  it("par negativo: SEM o campo (o aviso que chega pelo canal) não tem marca e abre", async () => {
    comSino([notificacao()]);
    await abrirPainel();
    await userEvent.click(await screen.findByText(FRASE));

    expect(screen.queryByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_EXCLUIDO])).not.toBeInTheDocument();
    expect(screen.queryByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_SEM_ACESSO])).not.toBeInTheDocument();
    expect(navegou).toHaveBeenCalledWith("/tarefas/s1/t1");
  });

  it("a morta NÃO lida conta no sino", async () => {
    comSino([notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO })]);
    await abrirPainel();

    expect(await screen.findByText("(1)")).toBeInTheDocument();
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
  const DOIS_SUBGRUPOS = [
    notificacao(),
    notificacao({ notificacao_id: "1787000000000002_ghi", subgrupo_id: "s2", alvo_id: "t2" }),
  ];

  it("🔴 com subgrupos MISTURADOS, cada linha diz de qual veio", async () => {
    /* O sino junta tudo que acontece nos seus subgrupos. "Fulano atribuiu uma
       tarefa a você" não diz de onde ela vem -- e quem participa de vários
       precisa saber antes de abrir. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [
        { subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" },
        { subgrupo_id: "s2", nome: "Trabalhista", grupo_id: "g1" },
      ],
    });
    comSino(DOIS_SUBGRUPOS);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    expect(await screen.findByTitle("Cível")).toHaveTextContent("Cível");
    expect(screen.getByTitle("Trabalhista")).toHaveTextContent("Trabalhista");
  });

  it("⚠️ sem o subgrupo no catálogo, mostra o id -- e não some", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
    comSino(DOIS_SUBGRUPOS);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    expect(await screen.findByTitle("s1")).toHaveTextContent("s1");
  });

  it("🔴 todas do MESMO subgrupo: o nome não aparece -- não diferencia nada", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
    });
    comSino([notificacao(), notificacao({ notificacao_id: "1787000000000003_jkl", alvo_id: "t3" })]);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    expect((await screen.findAllByText("Ana Paula atribuiu uma tarefa a você")).length).toBe(2);
    await waitFor(() => expect(mocks.listarSubgrupos).toHaveBeenCalled());
    expect(screen.queryByTitle("Cível")).not.toBeInTheDocument();
    expect(screen.queryByTitle("s1")).not.toBeInTheDocument();
  });

  it("⚠️ aviso SEM subgrupo não conta como outro subgrupo", async () => {
    /* Nem toda notificação tem subgrupo (a de sessão alterada não tem). Contada
       como um "subgrupo vazio", ela faria um painel de um subgrupo só repetir o
       nome em todas as linhas. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
    });
    comSino([
      notificacao(),
      notificacao({ notificacao_id: "1787000000000004_mno", subgrupo_id: undefined, alvo_tipo: undefined, alvo_id: undefined }),
    ]);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    expect((await screen.findAllByText("Ana Paula atribuiu uma tarefa a você")).length).toBe(2);
    await waitFor(() => expect(mocks.listarSubgrupos).toHaveBeenCalled());
    expect(screen.queryByTitle("Cível")).not.toBeInTheDocument();
  });

  it("🔴 morta num painel misturado mostra o subgrupo E a marca, na mesma linha", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [
        { subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" },
        { subgrupo_id: "s2", nome: "Trabalhista", grupo_id: "g1" },
      ],
    });
    comSino([
      notificacao(),
      notificacao({ notificacao_id: "1787000000000002_ghi", subgrupo_id: "s2", alvo_id: "t2", titulo: "Tarefa trancada", alvo_estado: ESTADO_DO_ALVO_SEM_ACESSO }),
    ]);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());

    const linha = (await screen.findByText("Tarefa trancada")).closest("button")!;
    expect(await within(linha).findByTitle("Trabalhista")).toBeInTheDocument();
    expect(within(linha).getByText(MARCA_DO_ALVO[ESTADO_DO_ALVO_SEM_ACESSO])).toBeInTheDocument();
  });

  it("⚠️ catálogo de subgrupos FALHOU: a linha mostra o id e a morta segue marcando lida", async () => {
    /* O sino não depende do catálogo para funcionar: ele só traduz o nome. */
    mocks.listarSubgrupos.mockRejectedValue(new Error("caiu"));
    comSino([
      notificacao({ alvo_estado: ESTADO_DO_ALVO_EXCLUIDO }),
      notificacao({ notificacao_id: "1787000000000002_ghi", subgrupo_id: "s2", alvo_id: "t2" }),
    ]);
    renderComProviders(<SinoDeNotificacoes />);
    await userEvent.click(sino());
    await waitFor(() => expect(mocks.listarSubgrupos).toHaveBeenCalled());

    expect(await screen.findByTitle("s1")).toHaveTextContent("s1");
    expect(screen.getByTitle("s2")).toHaveTextContent("s2");
    await userEvent.click(screen.getByTitle("s1").closest("button")!);
    expect(mocks.marcarNotificacaoLida).toHaveBeenCalledWith("1787000000000000_abc");
    expect(navegou).not.toHaveBeenCalled();
  });
});
