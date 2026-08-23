import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarHistorico: vi.fn(),
  detalhesProcesso: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, listarHistorico: mocks.listarHistorico, detalhesProcesso: mocks.detalhesProcesso };
});

import HistoricoPage from "./index";

const ITEM = {
  numero_processo: "00002668720218130559",
  enviado_em: "2026-08-15T03:02:13.990064+00:00",
  tipo_comunicacao: "Intimação",
  nome_orgao: "Vara Única",
  comunicacao_id: 671027498,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalhesProcesso.mockResolvedValue({ comunicacoes: [], processos: [] });
  mocks.listarHistorico.mockResolvedValue({ historico: [ITEM], total: 1, total_paginas: 1 });
});

describe("HistoricoPage", () => {
  it("abre filtrado em Movimentações -- lembrete é diário e dominaria a lista", async () => {
    renderComProviders(<HistoricoPage />);

    expect(await screen.findByText("Intimação", { exact: false })).toBeInTheDocument();
    expect(mocks.listarHistorico).toHaveBeenCalledWith({
      pagina: 1,
      tamanhoPagina: 10,
      tipoEnvio: "movimentacao",
    });
    // Filtro ligado precisa PARECER ligado: senão a pessoa vê uma lista
    // incompleta achando que está vendo tudo.
    expect(screen.getByRole("button", { name: /Movimentações/ })).toBeInTheDocument();
  });

  it("trocar o filtro refaz a busca e volta pra primeira página", async () => {
    const user = userEvent.setup();
    renderComProviders(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });

    await user.click(screen.getByRole("button", { name: /Movimentações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Lembretes" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "lembrete",
      }),
    );
  });

  it("'Todos' TIRA o filtro -- controle do valor vazio", async () => {
    // Este é o caso que quebrou: "Todos" manda valor vazio, e item de menu
    // com `value=""` o zag não registra -- a opção simplesmente não
    // selecionava. Os outros dois funcionavam, então o teste precisa ser
    // dela.
    const user = userEvent.setup();
    renderComProviders(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });

    await user.click(screen.getByRole("button", { name: /Movimentações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Todos" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "",
      }),
    );
  });

  it("envio que falhou aparece marcado -- é o que responde 'não fui avisado'", async () => {
    // O backend registra a falha justamente pra dar o que investigar; a
    // tela não mostrava isso.
    mocks.listarHistorico.mockResolvedValue({
      historico: [{ ...ITEM, falhou: true }],
      total: 1,
      total_paginas: 1,
    });
    renderComProviders(<HistoricoPage />);

    expect(await screen.findByText("Falha")).toBeInTheDocument();
  });

  it("vazio POR FILTRO oferece o caminho de volta", async () => {
    // Como a tela abre filtrada, "não tem nada" costuma ser mentira.
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.tamanhoPagina === 1
        ? Promise.resolve({ historico: [], total: 7, total_paginas: 7 })
        : Promise.resolve({ historico: [], total: 0, total_paginas: 0 }),
    );
    const user = userEvent.setup();
    renderComProviders(<HistoricoPage />);

    expect(await screen.findByText("Nenhum envio deste tipo.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver todos os envios" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "",
      }),
    );
  });

  it("o detalhe mostra o apelido embaixo do número e um destinatário por linha", async () => {
    // 20 dígitos não dizem de que processo se trata; o apelido é o nome que
    // alguém deu pra reconhecê-lo. E a lista de quem recebeu é o que se vem
    // conferir aqui -- uma fila de endereços colada por vírgula não se lê.
    mocks.detalhesProcesso.mockResolvedValue({
      comunicacoes: [],
      processos: [{ subgrupo_id: "sg1", numero_processo: ITEM.numero_processo, apelido: "Ação de cobrança" }],
    });
    mocks.listarHistorico.mockResolvedValue({
      historico: [{ ...ITEM, destinatarios: ["ana@argos.local", "joao@argos.local"] }],
      total: 1,
      total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<HistoricoPage />);

    await user.click(await screen.findByText("Intimação", { exact: false }));

    const dialogo = within(await screen.findByRole("dialog"));
    expect(await dialogo.findByText("Ação de cobrança")).toBeInTheDocument();
    expect(dialogo.getByText("ana@argos.local")).toBeInTheDocument();
    expect(dialogo.getByText("joao@argos.local")).toBeInTheDocument();
  });

  it("vazio de verdade diz outra coisa, sem botão", async () => {
    mocks.listarHistorico.mockResolvedValue({ historico: [], total: 0, total_paginas: 0 });
    renderComProviders(<HistoricoPage />);

    expect(
      await screen.findByText(
        "Nenhum e-mail enviado ainda. Os avisos de movimentação e de prazo aparecem aqui.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver todos os envios" })).not.toBeInTheDocument();
  });

  it("deep link com match abre o modal certo sozinho e consome o link", async () => {
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.numeroProcesso
        ? Promise.resolve({ historico: [ITEM] })
        : Promise.resolve({ historico: [ITEM], total: 1, total_paginas: 1 })
    );
    const onDeepLinkConsumido = vi.fn();
    renderComProviders(
      <HistoricoPage
        deepLink={{ processo: ITEM.numero_processo, comunicacaoId: String(ITEM.comunicacao_id) }}
        onDeepLinkConsumido={onDeepLinkConsumido}
      />
    );

    expect(await screen.findByText("Detalhes do envio")).toBeInTheDocument();
    expect(mocks.listarHistorico).toHaveBeenCalledWith({ numeroProcesso: ITEM.numero_processo });
    await waitFor(() => expect(onDeepLinkConsumido).toHaveBeenCalledTimes(1));
  });

  it("deep link sem match no comunicacao_id mostra toast e ainda consome o link", async () => {
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.numeroProcesso
        ? Promise.resolve({ historico: [] })
        : Promise.resolve({ historico: [ITEM], total: 1, total_paginas: 1 })
    );
    const onDeepLinkConsumido = vi.fn();
    renderComProviders(
      <HistoricoPage
        deepLink={{ processo: "outro-numero", comunicacaoId: "999" }}
        onDeepLinkConsumido={onDeepLinkConsumido}
      />
    );

    expect(
      await screen.findByText("Não foi possível localizar a notificação do link recebido.")
    ).toBeInTheDocument();
    await waitFor(() => expect(onDeepLinkConsumido).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Detalhes do envio")).not.toBeInTheDocument();
  });

  it("sem deepLink, não dispara a busca por numeroProcesso", async () => {
    renderComProviders(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });
    expect(mocks.listarHistorico).not.toHaveBeenCalledWith(
      expect.objectContaining({ numeroProcesso: expect.anything() })
    );
  });
});
