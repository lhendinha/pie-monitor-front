import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  papelAtende: vi.fn(),
  listarSubgrupos: vi.fn(),
  criarSubgrupo: vi.fn(),
  removerSubgrupo: vi.fn(),
  listarMembrosDoGrupo: vi.fn(),
  listarGrupos: vi.fn(),
  ehSuperAdmin: vi.fn(),
  listarSubgruposDoGrupo: vi.fn(),
  atualizarMembro: vi.fn(),
  getGrupoId: vi.fn(),
  criarConvite: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  adicionarMembro: vi.fn(),
  removerMembro: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  criarOpcaoProcesso: vi.fn(),
  atualizarOpcaoProcesso: vi.fn(),
  desativarOpcaoProcesso: vi.fn(),
  reativarOpcaoProcesso: vi.fn(),
  lerConfiguracoesDoGrupo: vi.fn(),
  atualizarConfiguracoesDoGrupo: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import GrupoPage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
  mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [] });
  mocks.listarGrupos.mockResolvedValue({ grupos: [] });
  mocks.ehSuperAdmin.mockReturnValue(false);
  mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
  mocks.lerConfiguracoesDoGrupo.mockResolvedValue({
    dias_para_arquivar: 7,
    dias_para_arquivar_minimo: 1,
    dias_para_arquivar_maximo: 365,
    dias_para_arquivar_padrao: 7,
  });
  mocks.atualizarConfiguracoesDoGrupo.mockResolvedValue({});
});

describe("GrupoPage", () => {
  it("tem título e subtítulo próprios, como toda tela", async () => {
    mocks.papelAtende.mockReturnValue(true);
    renderComProviders(<GrupoPage />);

    expect(screen.getByRole("heading", { name: "Grupo" })).toBeInTheDocument();
    expect(screen.getByText("Gestão de definições do grupo.")).toBeInTheDocument();
  });

  it("papel 'user' (só Subgrupos habilitado) mostra Subgrupos direto, sem sub-nav de outras abas", async () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user");
    renderComProviders(<GrupoPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    expect(screen.queryByRole("tab", { name: "Membros" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fases" })).not.toBeInTheDocument();
  });

  it("papel 'manager' vê Subgrupos e Membros, clicar em Membros troca o conteúdo", async () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user" || minimo === "manager");
    const user = userEvent.setup();
    renderComProviders(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    expect(screen.getByRole("tab", { name: "Membros" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Convidar" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Membros" }));
    expect(mocks.listarMembrosDoGrupo).toHaveBeenCalled();
  });

  it("papel 'admin' vê Fases e Situações -- o piso desceu de super_admin", async () => {
    // Este caso não existia, e era exatamente o que estava quebrado: as rotas
    // de Fase/Situação passaram a exigir `admin`, o `SUB_ABAS` continuou em
    // `super_admin`, e o admin ficou com a permissão no servidor sem ver as
    // abas. Ninguém tomava 403 -- a funcionalidade simplesmente sumia.
    mocks.papelAtende.mockImplementation(
      (minimo: string) => minimo !== "super_admin",
    );
    renderComProviders(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    for (const nome of ["Membros", "Convidar", "Fases", "Situações"]) {
      expect(screen.getByRole("tab", { name: nome })).toBeInTheDocument();
    }
  });

  it("papel 'super_admin' vê as 5 sub-abas, incluindo Fases/Situações", async () => {
    mocks.papelAtende.mockReturnValue(true);
    renderComProviders(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    for (const nome of ["Membros", "Convidar", "Fases", "Situações"]) {
      expect(screen.getByRole("tab", { name: nome })).toBeInTheDocument();
    }
  });

  it("ação numa opção trava SÓ a linha dela", async () => {
    /* "Reativar" não mudava nada até o refetch chegar, e quem não vê
     * retorno clica de novo. Travar a LISTA inteira seria o outro extremo:
     * numa lista de vinte fases, esconde qual delas está mudando.
     *
     * A reativação aqui nunca assenta -- é a espera congelada. */
    mocks.papelAtende.mockReturnValue(true);
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [
        { tipo: "fase", opcao_id: "f1", rotulo: "Inicial", ordem: 1, ativo: false },
        { tipo: "fase", opcao_id: "f2", rotulo: "Recursal", ordem: 2, ativo: false },
      ],
      total: 2,
      total_paginas: 1,
    });
    mocks.reativarOpcaoProcesso.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderComProviders(<GrupoPage />);

    await user.click(await screen.findByRole("tab", { name: "Fases" }));
    await user.click(await screen.findByRole("button", { name: "Reativar Inicial" }));

    expect(screen.getByRole("button", { name: "Reativar Inicial" })).toBeDisabled();
    // A outra linha segue utilizável.
    expect(screen.getByRole("button", { name: "Reativar Recursal" })).toBeEnabled();
  });

  describe("aba Configurações", () => {
    async function abrirConfiguracoes(user: ReturnType<typeof userEvent.setup>) {
      mocks.papelAtende.mockReturnValue(true);
      renderComProviders(<GrupoPage />);
      await user.click(await screen.findByRole("tab", { name: "Configurações" }));
    }

    it("o campo nasce com o que ESTÁ SALVO, não vazio", async () => {
      /* Vazio, um "Salvar" sem querer gravaria o mínimo -- ou nada. */
      const user = userEvent.setup();
      await abrirConfiguracoes(user);

      expect(await screen.findByLabelText(/Arquivar concluídas depois de/)).toHaveValue(7);
    });

    it("'Salvar' fica travado enquanto o valor não mudou", async () => {
      // Botão que grava o que já está gravado só gera requisição à toa.
      const user = userEvent.setup();
      await abrirConfiguracoes(user);

      await screen.findByLabelText(/Arquivar concluídas depois de/);
      expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    });

    it("valor fora do limite trava e DIZ o motivo", async () => {
      // Travar sem explicar faz a pessoa procurar o que faltou.
      const user = userEvent.setup();
      await abrirConfiguracoes(user);

      const campo = await screen.findByLabelText(/Arquivar concluídas depois de/);
      await user.clear(campo);
      await user.type(campo, "999");

      expect(await screen.findByText(/dentro do limite/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    });

    it("salva o número novo", async () => {
      const user = userEvent.setup();
      await abrirConfiguracoes(user);

      const campo = await screen.findByLabelText(/Arquivar concluídas depois de/);
      await user.clear(campo);
      await user.type(campo, "15");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalledWith(15));
    });

    it("a dica diz que arquivada CONTINUA concluída", async () => {
      /* É a dúvida que o nome "Arquivado" cria -- e a resposta errada
       * ("some do sistema") faria a pessoa evitar configurar. */
      const user = userEvent.setup();
      await abrirConfiguracoes(user);

      expect(
        await screen.findByText(/continua contando como concluída/),
      ).toBeInTheDocument();
    });
  });
});
