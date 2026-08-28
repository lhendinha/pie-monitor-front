import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComRota } from "../../test/queryTestUtils";

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
    renderComRota(<HistoricoPage />);

    expect(await screen.findByText("Intimação", { exact: false })).toBeInTheDocument();
    expect(mocks.listarHistorico).toHaveBeenCalledWith({
      pagina: 1,
      tamanhoPagina: 10,
      tipoEnvio: "movimentacao",
      apenasComFalha: false,
      dias: 0,
    });
    // Filtro ligado precisa PARECER ligado: senão a pessoa vê uma lista
    // incompleta achando que está vendo tudo.
    expect(screen.getByRole("button", { name: /Movimentações/ })).toBeInTheDocument();
  });

  it("trocar o filtro refaz a busca e volta pra primeira página", async () => {
    const user = userEvent.setup();
    renderComRota(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });

    await user.click(screen.getByRole("button", { name: /Movimentações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Lembretes" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "lembrete",
        apenasComFalha: false,
        dias: 0,
      }),
    );
  });

  it("'Todos' TIRA o filtro -- controle do valor vazio", async () => {
    // Este é o caso que quebrou: "Todos" manda valor vazio, e item de menu
    // com `value=""` o zag não registra -- a opção simplesmente não
    // selecionava. Os outros dois funcionavam, então o teste precisa ser
    // dela.
    const user = userEvent.setup();
    renderComRota(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });

    await user.click(screen.getByRole("button", { name: /Movimentações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Todos" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "",
        apenasComFalha: false,
        dias: 0,
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
    renderComRota(<HistoricoPage />);

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
    /* 🔴 Monta com os TRÊS filtros ligados, e não com os padrões.
       A primeira versão deste teste montava sem props: a tela nasce com
       `apenasComFalha: false` e `dias: 0`, então o assert lá embaixo passava
       mesmo que o botão limpasse SÓ o tipo -- que era exatamente o defeito.
       Um teste que não pode falhar não guarda nada. */
    renderComRota(
      <HistoricoPage tipoEnvioInicial="lembrete" apenasComFalhaInicial diasInicial={7} />,
    );

    /* ⚠️ "deste tipo" virou "com esses filtros" em 26/08/2026: com três
       filtros na tela, o vazio pode vir da falha ou do período, e a frase
       antiga mandava a pessoa olhar pro filtro errado. */
    expect(await screen.findByText("Nenhum envio com esses filtros.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver todos os envios" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "",
        apenasComFalha: false,
        dias: 0,
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
    renderComRota(<HistoricoPage />);

    await user.click(await screen.findByText("Intimação", { exact: false }));

    const dialogo = within(await screen.findByRole("dialog"));
    expect(await dialogo.findByText("Ação de cobrança")).toBeInTheDocument();
    expect(dialogo.getByText("ana@argos.local")).toBeInTheDocument();
    expect(dialogo.getByText("joao@argos.local")).toBeInTheDocument();
  });

  it("vazio de verdade diz outra coisa, sem botão", async () => {
    mocks.listarHistorico.mockResolvedValue({ historico: [], total: 0, total_paginas: 0 });
    renderComRota(<HistoricoPage />);

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
    renderComRota(
      <HistoricoPage
        deepLink={{ processo: ITEM.numero_processo, comunicacaoId: String(ITEM.comunicacao_id) }}
        onDeepLinkConsumido={onDeepLinkConsumido}
      />
    );

    expect(await screen.findByText("Detalhes do envio")).toBeInTheDocument();
    expect(mocks.listarHistorico).toHaveBeenCalledWith({ numeroProcesso: ITEM.numero_processo });
    await waitFor(() => expect(onDeepLinkConsumido).toHaveBeenCalledTimes(1));
  });

  it("o modal abre DURANTE a busca do link, não só quando ela termina", async () => {
    /* Quem chega por um link de e-mail não tem contexto nenhum: sem isto
     * ela caía numa lista comum, sem nada indicando que o item do link
     * estava sendo buscado -- e, se falhasse, só um toast que ela podia nem
     * associar ao link.
     *
     * A busca por `numeroProcesso` nunca assenta aqui: é a espera
     * congelada. Fica vermelho se o modal voltar a depender de `itemAberto`
     * pra existir. */
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.numeroProcesso
        ? new Promise(() => {})
        : Promise.resolve({ historico: [ITEM], total: 1, total_paginas: 1 })
    );
    renderComRota(
      <HistoricoPage
        deepLink={{ processo: ITEM.numero_processo, comunicacaoId: String(ITEM.comunicacao_id) }}
        onDeepLinkConsumido={vi.fn()}
      />
    );

    const dialogo = within(await screen.findByRole("dialog"));
    expect(dialogo.getByText("Detalhes do envio")).toBeInTheDocument();
    expect(
      dialogo.getByText("Localizando a notificação do link recebido…")
    ).toBeInTheDocument();
  });

  it("deep link sem match no comunicacao_id mostra toast e ainda consome o link", async () => {
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.numeroProcesso
        ? Promise.resolve({ historico: [] })
        : Promise.resolve({ historico: [ITEM], total: 1, total_paginas: 1 })
    );
    const onDeepLinkConsumido = vi.fn();
    renderComRota(
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
    renderComRota(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });
    expect(mocks.listarHistorico).not.toHaveBeenCalledWith(
      expect.objectContaining({ numeroProcesso: expect.anything() })
    );
  });
});

describe("os filtros que a Área de trabalho aciona", () => {
  /* 🔴 Medido em 26/08/2026, no ambiente local: "Envios com falha" contava
     2 e abria uma lista de 6; "Movimentações (7 dias)" contava 3 e abria 4.
     A rota `/historico` só aceitava `numero_processo` e `tipo_envio` --
     não havia filtro de falha nem de data, nem na API nem aqui.

     Número que não bate com a lista que ele abre é pior que número sem
     link: a pessoa deixa de confiar nos dois. */

  it("abre já filtrado em SÓ COM FALHA quando a home manda", async () => {
    renderComRota(<HistoricoPage tipoEnvioInicial="" apenasComFalhaInicial />);

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "",
        apenasComFalha: true,
        dias: 0,
      }),
    );
    /* ⚠️ E a pílula tem que PARECER ligada. Filtro invisível faz a pessoa
       ver uma lista incompleta achando que está vendo tudo -- a mesma regra
       que a pílula de tipo já seguia. */
    expect(await screen.findByRole("button", { name: "Só com falha" })).toHaveAttribute(
      "data-ativo",
    );
  });

  it("abre já recortado nos últimos dias quando a home manda", async () => {
    renderComRota(<HistoricoPage tipoEnvioInicial="movimentacao" diasInicial={7} />);

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "movimentacao",
        apenasComFalha: false,
        dias: 7,
      }),
    );
    expect(await screen.findByRole("button", { name: "Últimos 7 dias" })).toHaveAttribute(
      "data-ativo",
    );
  });

  it("as pílulas valem JUNTAS", async () => {
    /* Nenhum card da home leva a essa combinação -- mas a pessoa pode
       montá-la, e um filtro que ignora o outro mostra lista errada em
       silêncio. */
    const user = userEvent.setup();
    renderComRota(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });

    await user.click(screen.getByRole("button", { name: "Todos os envios" }));
    await user.click(await screen.findByRole("menuitem", { name: "Só com falha" }));
    await user.click(screen.getByRole("button", { name: "Todos os períodos" }));
    await user.click(await screen.findByRole("menuitem", { name: "Últimos 7 dias" }));

    await waitFor(() =>
      expect(mocks.listarHistorico).toHaveBeenCalledWith({
        pagina: 1,
        tamanhoPagina: 10,
        tipoEnvio: "movimentacao",
        apenasComFalha: true,
        dias: 7,
      }),
    );
  });

  it("🔴 o filtro entra na CHAVE de cache, não só na chamada", async () => {
    /* Sem isso, ligar um filtro reusaria o resultado do anterior: lista
       errada, sem erro nenhum. O jeito de provar é ver que a consulta é
       REFEITA -- se a chave não mudasse, o React Query serviria o cache. */
    const user = userEvent.setup();
    renderComRota(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });
    const antes = mocks.listarHistorico.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Todos os períodos" }));
    await user.click(await screen.findByRole("menuitem", { name: "Últimos 7 dias" }));

    await waitFor(() =>
      expect(mocks.listarHistorico.mock.calls.length).toBeGreaterThan(antes),
    );
  });
});

describe("botão 'Adicionar tarefa' nos Detalhes do envio", () => {
  /** Abre o modal de detalhes do primeiro item da lista. */
  async function abrirDetalhes(item: Record<string, unknown>) {
    mocks.listarHistorico.mockResolvedValue({
      historico: [{ ...ITEM, ...item }],
      total: 1,
      total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComRota(<HistoricoPage />);
    await user.click(await screen.findByText("Intimação", { exact: false }));
    await screen.findByText("Detalhes do envio");
    return user;
  }

  const botao = () => screen.queryByRole("button", { name: /Adicionar tarefa/ });

  it("aparece quando há UM subgrupo notificado", async () => {
    await abrirDetalhes({ subgrupos_notificados: ["s1"] });

    expect(botao()).toBeInTheDocument();
  });

  it("🔴 NÃO aparece em lembrete de tarefa -- ali não há processo nenhum", async () => {
    /* `numero_processo` num lembrete guarda `TAREFA#{id}`, porque é chave de
       partição. Vincular a tarefa nova a isso gravaria lixo num campo que a
       tela lê como número de processo. */
    await abrirDetalhes({
      subgrupos_notificados: ["s1"],
      tarefa_id: "t1",
      numero_processo: "TAREFA#t1",
    });

    expect(botao()).not.toBeInTheDocument();
  });

  it("🔴 NÃO aparece com VÁRIOS subgrupos -- não há resposta certa", async () => {
    /* O mesmo número vive em N subgrupos e o e-mail foi pra todos. Escolher
       um arbitrariamente faria a tarefa nascer no lugar errado sem ninguém
       perceber -- e `ModalDeTarefa` não tem estado "nenhum subgrupo":
       `subgrupoAtual` é obrigatório e semeia o seletor. */
    await abrirDetalhes({ subgrupos_notificados: ["s1", "s2"] });

    expect(botao()).not.toBeInTheDocument();
  });

  it("🔴 NÃO aparece quando `subgrupos_notificados` está AUSENTE", async () => {
    /* O campo é opcional, e registro anterior a 26/08/2026 não o tem -- 9 de
       73 medidos em produção. `undefined` é "não sei", e não se oferece o
       que não se sabe. Um `[0]` cru estouraria aqui. */
    await abrirDetalhes({});

    expect(botao()).not.toBeInTheDocument();
  });

  it("🔴 NÃO aparece com a lista VAZIA", async () => {
    /* Lista vazia não é o mesmo que um subgrupo: não há de onde a tarefa
       nascer, e `[0]` seria `undefined`. */
    await abrirDetalhes({ subgrupos_notificados: [] });

    expect(botao()).not.toBeInTheDocument();
  });

  it("abre a tarefa com o processo vinculado, e o detalhe segue aberto", async () => {
    const user = await abrirDetalhes({ subgrupos_notificados: ["s1"] });

    await user.click(botao()!);

    expect(await screen.findByText("Nova tarefa")).toBeInTheDocument();

    /* ⚠️ Procurado DENTRO do modal de tarefa, e não pela página: o número
       mascarado aparece três vezes com os dois modais abertos (na lista
       atrás, no detalhe do envio e na etiqueta do vínculo), então contar
       ocorrências prova o número errado e quebra ao mexer na lista. */
    const dialogos = await screen.findAllByRole("dialog");
    const modalDaTarefa = dialogos.find((d) => within(d).queryByText("Nova tarefa"));
    expect(within(modalDaTarefa!).getByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();

    // Os dois empilhados: fechar os dois devolveria a pessoa pra lista sem
    // o envio que ela estava lendo.
    expect(screen.getByText("Detalhes do envio")).toBeInTheDocument();
  });
});
