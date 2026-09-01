import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComRota } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  papelAtende: vi.fn(),
  listarSubgrupos: vi.fn(),
  criarSubgrupo: vi.fn(),
  removerSubgrupo: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
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
import { ABAS_DO_GRUPO } from "../../constants";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [] });
  mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [], total: 0, total_paginas: 1 });
  mocks.listarGrupos.mockResolvedValue({ grupos: [] });
  mocks.ehSuperAdmin.mockReturnValue(false);
  mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
  mocks.lerConfiguracoesDoGrupo.mockResolvedValue({
    nome: "Silva Advogados",
    nome_tamanho_maximo: 120,
    dias_para_arquivar: 7,
    dias_para_arquivar_minimo: 1,
    dias_para_arquivar_maximo: 365,
    dias_para_arquivar_padrao: 7,
    oabs_avulsas: [],
    oabs_avulsas_maximo: 50,
  });
  mocks.atualizarConfiguracoesDoGrupo.mockResolvedValue({});
});

/** Os fontes crus, pelo `import.meta.glob` do Vite -- ver
 * `CelulaComSub/celulaDeTabela.test.ts`: o `tsconfig` do front não carrega os
 * tipos do Node, e um teste que não passa no `tsc` quebra a checagem de tipos
 * do projeto inteiro. */
const FONTE_DA_PAGINA = Object.values(
  import.meta.glob("/src/pages/GrupoPage/index.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
)[0];

describe("🔴 toda aba declarada tem painel -- guarda de FORMA", () => {
  /* A aba nasce em `ABAS_DO_GRUPO` e o painel mora em `GrupoPage`, dois
     arquivos. Acrescentar a primeira e esquecer o segundo dá uma aba que abre
     para o NADA: sem erro, sem tela em branco reconhecível, só uma área vazia.
     Nenhum teste de comportamento pega isso, porque a aba sem painel não tem
     comportamento a testar. */

  it("varre o arquivo de verdade -- senão o guarda passaria vazio", () => {
    /* O par que impede o falso "passou": um glob errado devolveria `undefined`
       e as asserções abaixo não teriam o que reprovar. */
    expect(FONTE_DA_PAGINA).toContain("export default function GrupoPage");
    expect(ABAS_DO_GRUPO.length).toBeGreaterThan(5);
  });

  it.each(ABAS_DO_GRUPO.map((a) => a.id))("a aba %s tem painel e conteúdo", (id) => {
    expect(FONTE_DA_PAGINA).toContain(`<PainelDaAba grupo="grupo" id="${id}"`);
    /* O painel sozinho não basta: ele existe pra o `aria-controls` da aba ter
       onde apontar, e um vazio passaria na asserção acima. */
    expect(FONTE_DA_PAGINA).toContain(`abaAtiva === "${id}" &&`);
  });
});

describe("GrupoPage", () => {
  it("tem título e subtítulo próprios, como toda tela", async () => {
    mocks.papelAtende.mockReturnValue(true);
    renderComRota(<GrupoPage />);

    expect(screen.getByRole("heading", { name: "Grupo" })).toBeInTheDocument();
    expect(screen.getByText("Gestão de definições do grupo.")).toBeInTheDocument();
  });

  it("papel 'user' (só Subgrupos habilitado) mostra Subgrupos direto, sem sub-nav de outras abas", async () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user");
    renderComRota(<GrupoPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    expect(screen.queryByRole("tab", { name: "Membros" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fases" })).not.toBeInTheDocument();
  });

  it("papel 'manager' vê Subgrupos e Membros, clicar em Membros troca o conteúdo", async () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user" || minimo === "manager");
    const user = userEvent.setup();
    renderComRota(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    expect(screen.getByRole("tab", { name: "Membros" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Convidar" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Membros" }));
    // A aba de Membros usa a rota paginada; a completa é do formulário de edição.
    expect(mocks.listarMembrosDoGrupo).toHaveBeenCalled();
  });

  it("papel 'admin' vê Fases e Situações -- o piso desceu de super_admin", async () => {
    // Este caso não existia, e era exatamente o que estava quebrado: as rotas
    // de Fase/Situação passaram a exigir `admin`, o `ABAS_DO_GRUPO` continuou em
    // `super_admin`, e o admin ficou com a permissão no servidor sem ver as
    // abas. Ninguém tomava 403 -- a funcionalidade simplesmente sumia.
    mocks.papelAtende.mockImplementation(
      (minimo: string) => minimo !== "super_admin",
    );
    renderComRota(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    for (const nome of ["Membros", "Convidar", "Fases", "Situações"]) {
      expect(screen.getByRole("tab", { name: nome })).toBeInTheDocument();
    }
  });

  it("papel 'super_admin' vê TODAS as sub-abas declaradas", async () => {
    /* ⚠️ A lista vem de `ABAS_DO_GRUPO`, e não escrita à mão: o título dizia
       "as 5 sub-abas" enquanto o laço conferia quatro nomes, e nenhum dos dois
       acompanhava a constante. Aba nova entrava sem ninguém notar. */
    mocks.papelAtende.mockReturnValue(true);
    renderComRota(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    for (const aba of ABAS_DO_GRUPO) {
      expect(screen.getByRole("tab", { name: aba.label })).toBeInTheDocument();
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
    renderComRota(<GrupoPage />);

    await user.click(await screen.findByRole("tab", { name: "Fases" }));
    await user.click(await screen.findByRole("button", { name: "Reativar Inicial" }));

    expect(screen.getByRole("button", { name: "Reativar Inicial" })).toBeDisabled();
    // A outra linha segue utilizável.
    expect(screen.getByRole("button", { name: "Reativar Recursal" })).toBeEnabled();
  });

  describe("aba Configurações", () => {
    async function abrirConfiguracoes(user: ReturnType<typeof userEvent.setup>) {
      mocks.papelAtende.mockReturnValue(true);
      renderComRota(<GrupoPage />);
      await user.click(await screen.findByRole("tab", { name: "Configurações" }));
    }

    /* Só o de INTEGRAÇÃO aqui: que a aba monta e mostra as configurações.
       O comportamento do formulário (PATCH parcial, validação, erros) é
       testado em ConfiguracoesDoGrupo/index.test.tsx, onde ele mora. */
    it("mostra as configurações do grupo", async () => {
      const user = userEvent.setup();
      await abrirConfiguracoes(user);

      expect(await screen.findByLabelText(/Nome do grupo/)).toHaveValue("Silva Advogados");
      expect(screen.getByLabelText(/Arquivar concluídas depois de/)).toHaveValue(7);
    });

  });

  describe("aba Inscrições na OAB", () => {
    /* Só o de INTEGRAÇÃO aqui -- que a aba monta e lê a rota certa. O
       comportamento (releitura antes de gravar, repetida, teto, interruptor)
       é testado em InscricoesDoGrupo/ e LinhaDaInscricao/, onde ele mora. */
    it("monta e lista as inscrições do grupo", async () => {
      mocks.papelAtende.mockReturnValue(true);
      mocks.lerConfiguracoesDoGrupo.mockResolvedValue({
        nome: "Silva Advogados",
        nome_tamanho_maximo: 120,
        dias_para_arquivar: 7,
        dias_para_arquivar_minimo: 1,
        dias_para_arquivar_maximo: 365,
        dias_para_arquivar_padrao: 7,
        oabs_avulsas: [
          { inscricao: "263/MG", importacao_automatica: false, subgrupos_destino: [] },
        ],
        oabs_avulsas_maximo: 50,
      });
      const user = userEvent.setup();
      renderComRota(<GrupoPage />);

      await user.click(await screen.findByRole("tab", { name: "Inscrições na OAB" }));

      expect(await screen.findByText("263/MG")).toBeInTheDocument();
    });

    it("fica FORA para quem não é admin -- o piso espelha o da rota", async () => {
      /* O par negativo do piso: sem ele, um `manager` veria a aba, clicaria e
         tomaria 403 numa tela que o sistema ofereceu. */
      mocks.papelAtende.mockImplementation(
        (minimo: string) => minimo === "user" || minimo === "manager",
      );
      renderComRota(<GrupoPage />);

      await screen.findByRole("tab", { name: "Subgrupos" });
      expect(
        screen.queryByRole("tab", { name: "Inscrições na OAB" }),
      ).not.toBeInTheDocument();
    });
  });
});

