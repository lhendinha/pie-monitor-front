import { fireEvent, screen, waitFor } from "@testing-library/react";
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
    renderComProviders(<ProcessosPage />);
    expect(await screen.findByText("Meu processo")).toBeInTheDocument();
    expect(mocks.listarProcessos).toHaveBeenCalledWith({ pagina: 1, tamanhoPagina: 10 });
  });

  it("busca troca os parâmetros (ignora pagina/tamanhoPagina) -- texto livre, não só número", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.type(screen.getByLabelText("Pesquisar processo por número, cliente ou apelido"), "cobrança de honorários");

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith({
        busca: "cobrança de honorários",
        clienteId: "",
        faseIds: [],
        situacaoIds: [],
        dataVerificarAte: "",
        prazoFinalAte: "",
      })
    );
  });

  it("remover um processo invalida só 'processos' -- não refaz o fetch de subgrupos", async () => {
    mocks.removerProcesso.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);

    await user.click(await screen.findByText("Meu processo"));
    const chamadasSubgruposAntes = mocks.listarSubgrupos.mock.calls.length;
    const chamadasProcessosAntes = mocks.listarProcessos.mock.calls.length;

    // Excluir vive no detalhe, não na linha -- é onde o artifact põe, e
    // evita botão destrutivo a um clique de distância numa lista.
    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    // A contagem exata deixou de ser estável: a tela faz DUAS queries de
    // processos (a lista e o total sem filtro, que alimenta o "de Y" da
    // contagem), e as duas são invalidadas juntas. O que o teste protege é
    // que subgrupos NÃO é refeito -- invalidar demais custa requisição à toa.
    await waitFor(() =>
      expect(mocks.listarProcessos.mock.calls.length).toBeGreaterThan(chamadasProcessosAntes),
    );
    expect(mocks.listarSubgrupos.mock.calls.length).toBe(chamadasSubgruposAntes);
    expect(mocks.removerProcesso).toHaveBeenCalledWith("sg1", "00002668720218130559");
  });

  it("mostra 'Nenhum processo cadastrado ainda.' quando a lista vem vazia", async () => {
    mocks.listarProcessos.mockResolvedValue({ processos: [], total: 0, total_paginas: 0 });
    renderComProviders(<ProcessosPage />);
    expect(await screen.findByText("Nenhum processo cadastrado ainda.")).toBeInTheDocument();
  });

  it("cadastra processo com os campos novos preenchidos", async () => {
    mocks.criarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByRole("button", { name: "+ Novo processo" }));

    await user.type(screen.getByLabelText("Número do processo"), "00002668720218130559");
    await user.type(screen.getByLabelText("Apelido (opcional)"), "Novo apelido");
    await user.type(screen.getByLabelText("Objeto/Assunto"), "Cobrança");
    await user.type(screen.getByLabelText("Próxima providência"), "Aguardar prazo");
    fireEvent.change(screen.getByLabelText("Data para verificar"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Prazo final"), { target: { value: "2026-12-15" } });
    await user.type(screen.getByLabelText("Observações"), "Obs teste");

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(mocks.criarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Novo apelido",
        expect.objectContaining({
          objetoAssunto: "Cobrança",
          proximaProvidencia: "Aguardar prazo",
          dataVerificar: "2026-12-01",
          prazoFinal: "2026-12-15",
          observacoes: "Obs teste",
        })
      )
    );
  });

  it("não tem mais botão de 'editar apelido' separado -- foi consolidado no modal novo", async () => {
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");
    expect(screen.queryByTitle("Editar apelido")).not.toBeInTheDocument();
  });

  it("clicar na linha abre o modal de edição e envia o PATCH com os campos editados", async () => {
    mocks.atualizarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Meu processo"));

    const apelidoInput = await screen.findByLabelText("Apelido");
    await user.clear(apelidoInput);
    await user.type(apelidoInput, "Apelido editado");
    await user.type(screen.getByLabelText("Objeto/Assunto"), "Assunto editado");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Apelido editado",
        expect.objectContaining({ objetoAssunto: "Assunto editado" })
      )
    );
  });

  it("clicar na linha abre o detalhe", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);

    await user.click(await screen.findByText("Meu processo"));

    expect(await screen.findByLabelText("Apelido")).toBeInTheDocument();
  });

  it("a linha abre pelo teclado -- Enter na linha focada", async () => {
    // A linha inteira é clicável e não é <button>. Sem tratar Enter, quem
    // navega por Tab não conseguiria abrir processo nenhum: as ações saíram
    // da linha e foram pro detalhe, então não há outro caminho.
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    const linha = screen.getByText("Meu processo").closest("tr")!;
    linha.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByLabelText("Apelido")).toBeInTheDocument();
  });

  it("excluir pelo detalhe fecha o detalhe", async () => {
    mocks.removerProcesso.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);

    await user.click(await screen.findByText("Meu processo"));
    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerProcesso).toHaveBeenCalled());
    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
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

    renderComProviders(<ProcessosPage />);

    // Situação em cima, fase como linha secundária -- é o par da coluna
    // "Situação" no artifact.
    expect(await screen.findByText("Aguardando sentença")).toBeInTheDocument();
    expect(screen.getByText("Conhecimento (1º Grau)")).toBeInTheDocument();
    // Prazo final é a data; `data_verificar` deixou de aparecer na tabela
    // (continua editável no detalhe e continua disparando lembrete).
    expect(screen.getByText("01/09/2026")).toBeInTheDocument();
  });

  it("escolher no chip de situação filtra na hora -- sem passo de aplicar", async () => {
    // Os filtros usam o `MultiSelect` do projeto na variante "chip" (o
    // mesmo react-select das outras telas, não uma terceira implementação).
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ situacaoIds: ["sit-1"] }),
      ),
    );
  });

  it("situação aceita mais de um valor ao mesmo tempo", async () => {
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
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));
    // Reabre pelo rótulo ATUAL: escolhido um valor, o chip passa a mostrá-lo
    // no lugar de "Todas as situações" -- é o comportamento do artifact, e
    // quem faz isso é o `ResumoSelecionados` que o projeto já tinha.
    await user.click(screen.getByText("Aguardando sentença"));
    await user.click(await screen.findByRole("option", { name: /Aguardando audiência/ }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ situacaoIds: ["sit-1", "sit-2"] }),
      ),
    );
  });

  it("desmarcar a única opção volta a listagem pro estado sem filtro", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Todas as situações"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ situacaoIds: ["sit-1"] }),
      ),
    );

    // Clicar de novo desmarca -- é caixa de seleção, não escolha única.
    await user.click(screen.getByText("Aguardando sentença"));
    await user.click(await screen.findByRole("option", { name: /Aguardando sentença/ }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith({ pagina: 1, tamanhoPagina: 10 }),
    );
  });

  it("cadastra processo com os campos novos preenchidos", async () => {
    mocks.criarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByRole("button", { name: "+ Novo processo" }));

    await user.type(screen.getByLabelText("Número do processo"), "00002668720218130559");
    await user.type(screen.getByLabelText("Apelido (opcional)"), "Novo apelido");
    await user.type(screen.getByLabelText("Objeto/Assunto"), "Cobrança");
    await user.type(screen.getByLabelText("Próxima providência"), "Aguardar prazo");
    fireEvent.change(screen.getByLabelText("Data para verificar"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Prazo final"), { target: { value: "2026-12-15" } });
    await user.type(screen.getByLabelText("Observações"), "Obs teste");

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(mocks.criarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Novo apelido",
        expect.objectContaining({
          objetoAssunto: "Cobrança",
          proximaProvidencia: "Aguardar prazo",
          dataVerificar: "2026-12-01",
          prazoFinal: "2026-12-15",
          observacoes: "Obs teste",
        })
      )
    );
  });

  it("não tem mais botão de 'editar apelido' separado -- foi consolidado no modal novo", async () => {
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");
    expect(screen.queryByTitle("Editar apelido")).not.toBeInTheDocument();
  });

  it("clicar na linha abre o modal de edição e envia o PATCH com os campos editados", async () => {
    mocks.atualizarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Meu processo"));

    const apelidoInput = await screen.findByLabelText("Apelido");
    await user.clear(apelidoInput);
    await user.type(apelidoInput, "Apelido editado");
    await user.type(screen.getByLabelText("Objeto/Assunto"), "Assunto editado");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Apelido editado",
        expect.objectContaining({ objetoAssunto: "Assunto editado" })
      )
    );
  });

  it("clicar na linha abre o detalhe", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);

    await user.click(await screen.findByText("Meu processo"));

    expect(await screen.findByLabelText("Apelido")).toBeInTheDocument();
  });

  it("a linha abre pelo teclado -- Enter na linha focada", async () => {
    // A linha inteira é clicável e não é <button>. Sem tratar Enter, quem
    // navega por Tab não conseguiria abrir processo nenhum: as ações saíram
    // da linha e foram pro detalhe, então não há outro caminho.
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    const linha = screen.getByText("Meu processo").closest("tr")!;
    linha.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByLabelText("Apelido")).toBeInTheDocument();
  });

  it("excluir pelo detalhe fecha o detalhe", async () => {
    mocks.removerProcesso.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);

    await user.click(await screen.findByText("Meu processo"));
    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerProcesso).toHaveBeenCalled());
    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
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

    renderComProviders(<ProcessosPage />);

    // Situação em cima, fase como linha secundária -- é o par da coluna
    // "Situação" no artifact.
    expect(await screen.findByText("Aguardando sentença")).toBeInTheDocument();
    expect(screen.getByText("Conhecimento (1º Grau)")).toBeInTheDocument();
    // Prazo final é a data; `data_verificar` deixou de aparecer na tabela
    // (continua editável no detalhe e continua disparando lembrete).
    expect(screen.getByText("01/09/2026")).toBeInTheDocument();
  });
});
