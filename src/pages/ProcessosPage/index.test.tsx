import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarProcessos: vi.fn(),
  removerProcesso: vi.fn(),
  listarSubgrupos: vi.fn(),
  criarProcesso: vi.fn(),
  atualizarProcesso: vi.fn(),
  listarClientes: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  detalhesProcesso: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ProcessosPage from "./index";

/** Marca onde a navegação parou, sem montar a página de detalhe inteira --
 * o que este arquivo testa é a listagem. */
function EspiaoDeRota() {
  const { subgrupoId, numero } = useParams();
  return <div>{`detalhe ${subgrupoId}/${numero}`}</div>;
}

const PROCESSO = {
  subgrupo_id: "sg1",
  numero_processo: "00002668720218130559",
  apelido: "Meu processo",
  ultima_verificacao: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [{ subgrupo_id: "sg1", nome: "Cível" }] });
  mocks.listarProcessos.mockResolvedValue({ processos: [PROCESSO], total: 1, total_paginas: 1 });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  // Fases e situações reais no padrão: os chips de filtro precisam de
  // opções pra abrir com conteúdo, e antes dos chips nenhum teste dependia
  // disso.
  mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
    Promise.resolve({
      opcoes:
        tipo === "fase"
          ? [{ opcao_id: "fase-1", tipo: "fase", rotulo: "Conhecimento (1º Grau)", ordem: 1, ativo: true }]
          : [{ opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true }],
    }),
  );
  mocks.detalhesProcesso.mockResolvedValue({ comunicacoes: [] });
});

describe("ProcessosPage", () => {
  it("mostra a lista de processos depois de carregar, com pagina/tamanhoPagina", async () => {
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    expect(await screen.findByText("Meu processo")).toBeInTheDocument();
    // `objectContaining` porque a chamada agora leva os filtros vazios
    // junto -- a paginação vai SEMPRE, com ou sem filtro.
    expect(mocks.listarProcessos).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanhoPagina: 10 }),
    );
  });

  it("🔴 busca MANTÉM a paginação -- o servidor pagina o filtro desde a Fase 1a", async () => {
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.type(screen.getByLabelText("Pesquisar processo por número, cliente ou apelido"), "cobrança de honorários");

    await waitFor(() =>
      /* Este teste travava o contrato ANTIGO: afirmava que a busca descarta
       * `pagina`/`tamanhoPagina`. Era por isso que a suíte passava verde com
       * o defeito -- filtrar tornava inalcançável tudo além dos 10
       * primeiros, e o teste dizia que estava certo. */
      expect(mocks.listarProcessos).toHaveBeenCalledWith({
        busca: "cobrança de honorários",
        clienteId: "",
        faseIds: [],
        situacaoIds: [],
        dataVerificarAte: "",
        prazoFinalAte: "",
        pagina: 1,
        tamanhoPagina: 10,
      })
    );
  });


  it("mostra 'Nenhum processo cadastrado ainda.' quando a lista vem vazia", async () => {
    mocks.listarProcessos.mockResolvedValue({ processos: [], total: 0, total_paginas: 0 });
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    expect(await screen.findByText("Nenhum processo cadastrado ainda.")).toBeInTheDocument();
  });

  it("cadastra processo com os campos novos preenchidos", async () => {
    mocks.criarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByRole("button", { name: "+ Novo processo" }));

    // Regex nos rótulos: os obrigatórios carregam um "*" depois do texto.
    await user.type(screen.getByLabelText(/Número do processo/), "00002668720218130559");
    await user.type(screen.getByLabelText("Apelido (opcional)"), "Novo apelido");
    await user.type(screen.getByLabelText("Objeto / assunto"), "Cobrança");
    await user.type(screen.getByLabelText("Próxima providência"), "Aguardar prazo");
    await user.type(screen.getByLabelText("Observações"), "Obs teste");

    // As datas passaram a ser o `SeletorData` (calendário), como no
    // artifact -- não há mais `input[type=date]` pra `fireEvent.change`.
    // Escolher um dia qualquer basta aqui: o que este teste garante é que o
    // campo chega na chamada. O formato ISO tem teste próprio em
    // `SeletorData`, e o rascunho/aplicar em `FiltroDatas`.
    await user.click(screen.getByLabelText("Data para verificar"));
    await user.click(
      (await screen.findAllByRole("button", { name: /de \w+ de \d{4}/ }))[10],
    );

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(mocks.criarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Novo apelido",
        expect.objectContaining({
          objetoAssunto: "Cobrança",
          proximaProvidencia: "Aguardar prazo",
          dataVerificar: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          observacoes: "Obs teste",
        })
      )
    );
  });

  it("não tem mais botão de 'editar apelido' separado -- foi consolidado no modal novo", async () => {
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");
    expect(screen.queryByTitle("Editar apelido")).not.toBeInTheDocument();
  });


  it("clicar na linha NAVEGA pro detalhe, com subgrupo e número na URL", async () => {
    // O detalhe deixou de ser modal: é rota, porque o e-mail de lembrete
    // manda link direto pra ela e ela precisa sobreviver a um F5.
    const user = userEvent.setup();
    renderComProviders(
      <MemoryRouter initialEntries={["/processos"]}>
        <Routes>
          <Route path="/processos" element={<ProcessosPage />} />
          <Route path="/processos/:subgrupoId/:numero" element={<EspiaoDeRota />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByText("Meu processo"));

    expect(await screen.findByText("detalhe sg1/00002668720218130559")).toBeInTheDocument();
  });

  it("a linha abre pelo teclado -- Enter na linha focada", async () => {
    // A linha inteira é clicável e não é <button>. Sem tratar Enter, quem
    // navega por Tab não conseguiria abrir processo nenhum: as ações saíram
    // da linha e foram pro detalhe, então não há outro caminho.
    const user = userEvent.setup();
    renderComProviders(
      <MemoryRouter initialEntries={["/processos"]}>
        <Routes>
          <Route path="/processos" element={<ProcessosPage />} />
          <Route path="/processos/:subgrupoId/:numero" element={<EspiaoDeRota />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Meu processo");

    screen.getByText("Meu processo").closest("tr")!.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("detalhe sg1/00002668720218130559")).toBeInTheDocument();
  });



  it("mostra situação, fase e prazo nas colunas da tabela", async () => {
    mocks.listarProcessos.mockResolvedValue({
      processos: [{
        ...PROCESSO,
        fase_id: "fase-1", situacao_id: "sit-1", data_verificar: "2026-08-25", prazo_final: "2026-09-01",
      }],
      total: 1, total_paginas: 1,
    });
    mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
      Promise.resolve({
        opcoes: tipo === "fase"
          ? [{ opcao_id: "fase-1", tipo: "fase", rotulo: "Conhecimento (1º Grau)", ordem: 1, ativo: true }]
          : [{ opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true }],
      })
    );

    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);

    // Situação em cima, fase como linha secundária -- é o par da coluna
    // "Situação" no artifact.
    expect(await screen.findByText("Aguardando sentença")).toBeInTheDocument();
    expect(screen.getByText("Conhecimento (1º Grau)")).toBeInTheDocument();
    // Prazo final é a data; `data_verificar` deixou de aparecer na tabela
    // (continua editável no detalhe e continua disparando lembrete).
    expect(screen.getByText("01/09/2026")).toBeInTheDocument();
  });

  it("a seleção só vale ao clicar em Aplicar", async () => {
    // Seleção MÚLTIPLA com rodapé Cancelar/Aplicar, como no artifact:
    // aplicar a cada caixa marcada faria três requisições pra quem quer
    // três situações.
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));

    // Ainda não filtrou -- só marcou.
    expect(mocks.listarProcessos).not.toHaveBeenCalledWith(
      expect.objectContaining({ situacaoIds: ["sit-1"] }),
    );

    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ situacaoIds: ["sit-1"] }),
      ),
    );
  });

  it("Cancelar descarta o que foi marcado", async () => {
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mocks.listarProcessos).not.toHaveBeenCalledWith(
      expect.objectContaining({ situacaoIds: ["sit-1"] }),
    );
    // E o chip volta a mostrar o rótulo padrão.
    expect(screen.getByText("Todas as situações")).toBeInTheDocument();
  });

  it("aceita mais de uma situação de uma vez", async () => {
    // "Aguardando contestação OU audiência" é pergunta de todo dia num
    // escritório -- com valor único ela não tinha resposta.
    mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
      Promise.resolve({
        opcoes:
          tipo === "fase"
            ? []
            : [
                { opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true },
                { opcao_id: "sit-2", tipo: "situacao", rotulo: "Aguardando audiência", ordem: 2, ativo: true },
              ],
      }),
    );
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));
    await user.click(await screen.findByRole("option", { name: /Aguardando audiência/ }));
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ situacaoIds: ["sit-1", "sit-2"] }),
      ),
    );
  });

  it("'Todas as situações' no topo do painel limpa a seleção", async () => {
    // Sem essa linha, escolher um filtro seria irreversível sem recarregar.
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ situacaoIds: ["sit-1"] }),
      ),
    );

    await user.click(screen.getByText("Aguardando sentença"));
    await user.click(screen.getByRole("button", { name: "Todas as situações" }));
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith(
        expect.objectContaining({ situacaoIds: [], pagina: 1, tamanhoPagina: 10 }),
      ),
    );
  });

  it("o cliente é valor único: escolher já filtra, sem rodapé", async () => {
    // Diferente de situação/fase, o painel de cliente do artifact não tem
    // Cancelar/Aplicar -- com valor único não existe "montar" uma seleção.
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "cli-1", nome: "Construtora Alfa" }],
    });
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todos os clientes"));
    await user.click(await screen.findByRole("option", { name: "Construtora Alfa" }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: "cli-1" }),
      ),
    );
  });

  it("'Todos os clientes' no topo do painel limpa o filtro de cliente", async () => {
    // A linha do topo NÃO é uma opção da lista com valor vazio: é a moldura
    // do painel. Enquanto era opção, ela vinha junto dos clientes e o painel
    // divergia do artifact.
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "cli-1", nome: "Construtora Alfa" }],
    });
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todos os clientes"));
    await user.click(await screen.findByRole("option", { name: "Construtora Alfa" }));
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: "cli-1" }),
      ),
    );

    await user.click(screen.getByText("Construtora Alfa"));
    await user.click(await screen.findByRole("button", { name: "Todos os clientes" }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith(
        expect.objectContaining({ situacaoIds: [], pagina: 1, tamanhoPagina: 10 }),
      ),
    );
  });
});

describe("paginação com filtro ativo", () => {
  it("🔴 a barra de páginas NÃO some quando há filtro", async () => {
    /* O servidor pagina o filtro desde a Fase 1a -- o comentário dele diz
     * "antes devolvia o resultado inteiro num payload só, e o front tinha
     * que esconder a paginação". O front não acompanhou: filtrar por uma
     * situação com 40 processos mostrava 10, a contagem dizia 40, e não
     * havia barra de páginas nem seletor de "Por página". Os outros 30 não
     * tinham como ser vistos. */
    const user = userEvent.setup();
    mocks.listarProcessos.mockResolvedValue({
      processos: [PROCESSO],
      total: 40,
      total_paginas: 4,
    });
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.type(
      screen.getByLabelText("Pesquisar processo por número, cliente ou apelido"),
      "cobrança",
    );

    // ⚠️ Espera o filtro ficar ATIVO antes de olhar a barra. A busca tem 300ms
    // de debounce: sem esta espera o teste conferia a tela ainda sem filtro,
    // e passava mesmo com o defeito de volta.
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ busca: "cobrança" }),
      ),
    );

    expect(await screen.findByRole("button", { name: "2" })).toBeInTheDocument();
  });
});

describe("filtro e página", () => {
  it("🔴 aplicar filtro volta pra página 1 -- senão a pessoa fica presa numa tela vazia", async () => {
    /* Regressão introduzida ao fazer a paginação valer também com filtro:
     * `pagina` só era resetada ao trocar o TAMANHO da página. Filtrar
     * estando na página 3 pedia a página 3 do conjunto filtrado, que
     * costuma não existir -- o servidor devolvia lista vazia e a barra de
     * páginas sumia junto (ela só aparece com `processos.length > 0`).
     * Não sobrava nem o botão "1" pra clicar. */
    const user = userEvent.setup();
    mocks.listarProcessos.mockResolvedValue({
      processos: [PROCESSO],
      total: 40,
      total_paginas: 4,
    });
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText("Meu processo");

    await user.click(await screen.findByRole("button", { name: "3" }));
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 3 }),
      ),
    );

    await user.type(
      screen.getByLabelText("Pesquisar processo por número, cliente ou apelido"),
      "cobrança",
    );

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith(
        expect.objectContaining({ busca: "cobrança", pagina: 1 }),
      ),
    );
  });

  it("🔴 mudar de filtro não dispara requisição com a página VELHA", async () => {
    /* Com `setPagina(1)` num `useEffect`, o reset rodava DEPOIS da
     * renderização que já carregava os filtros novos: saía um
     * `GET ...&pagina=2` (filtros novos, página velha) só pra ser
     * descartado pelo pedido correto. Duas requisições por mudança de
     * filtro, e a primeira existia só pra ser jogada fora.
     *
     * O teste vizinho usa `toHaveBeenLastCalledWith`, que convive com o
     * desperdício. Este olha TODAS as chamadas. */
    mocks.listarProcessos.mockResolvedValue({
      processos: [PROCESSO], total: 40, total_paginas: 4,
    });
    const user = userEvent.setup();
    renderComProviders(<MemoryRouter><ProcessosPage /></MemoryRouter>);
    await screen.findByText(PROCESSO.apelido);

    await user.click(await screen.findByRole("button", { name: "2" }));
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 2 }),
      ),
    );

    mocks.listarProcessos.mockClear();
    await user.type(
      screen.getByLabelText("Pesquisar processo por número, cliente ou apelido"),
      "zzz",
    );

    await waitFor(() => expect(mocks.listarProcessos).toHaveBeenCalled());
    /* ⚠️ Sem anotar o parâmetro: a anotação `[p]: [Record<string, unknown>]`
     * não é atribuível ao predicado de `filter` e quebrava o `tsc -b` do
     * `yarn build` com TS2769 -- verde no vitest, vermelho no CI. */
    const comPaginaVelha = mocks.listarProcessos.mock.calls.filter(
      (chamada) => (chamada[0] as { pagina?: number })?.pagina === 2,
    );
    expect(comPaginaVelha).toEqual([]);
  });
});
