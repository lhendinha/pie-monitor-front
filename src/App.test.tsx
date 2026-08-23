import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "./test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  estaAutenticado: vi.fn(),
  papelAtende: vi.fn(),
  getPapel: vi.fn(),
  getApelido: vi.fn(),
  getEmail: vi.fn(),
  logout: vi.fn(),
  limparTokens: vi.fn(),
}));

vi.mock("./services", async () => {
  const real = await vi.importActual<Record<string, unknown>>("./services");
  return { ...real, ...mocks };
});

// As páginas reais fazem rede e não são o assunto aqui -- o que este arquivo
// testa é PRA ONDE o router manda, não o que cada tela desenha.
vi.mock("./pages", () => ({
  LoginPage: () => <div>tela de login</div>,
  EsqueciSenhaPage: () => <div>tela de esqueci senha</div>,
  AceitarConvitePage: ({ token }: { token: string }) => <div>convite {token}</div>,
  RedefinirSenhaPage: ({ token }: { token: string }) => <div>redefinir {token}</div>,
  ProcessosPage: () => <div>tela de processos</div>,
  ProcessoDetalhePage: () => <div>detalhe do processo</div>,
  ClientesPage: () => <div>tela de clientes</div>,
  ClienteDetalhePage: () => <div>detalhe do cliente</div>,
  GrupoPage: () => <div>tela de grupo</div>,
  WorkspacePage: () => <div>área de trabalho</div>,
  PerfilPage: () => <div>tela de perfil</div>,
  HistoricoPage: ({ deepLink }: { deepLink: { comunicacaoId: string } | null }) => (
    <div>histórico {deepLink ? `deep:${deepLink.comunicacaoId}` : "sem deep"}</div>
  ),
}));

import App from "./App";

function irPara(url: string) {
  window.history.pushState({}, "", url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.estaAutenticado.mockReturnValue(true);
  mocks.papelAtende.mockReturnValue(true);
  mocks.getPapel.mockReturnValue("admin");
  mocks.getApelido.mockReturnValue("Alva");
  mocks.getEmail.mockReturnValue("alva@x.com");
  irPara("/");
});

describe("rotas públicas", () => {
  it("/convite/{token} entrega o token pra página, sem exigir login", () => {
    mocks.estaAutenticado.mockReturnValue(false);
    irPara("/convite/abc123");
    renderComProviders(<App />);
    expect(screen.getByText("convite abc123")).toBeInTheDocument();
  });

  it("/redefinir-senha/{token} idem -- é o link do e-mail de recuperação", () => {
    mocks.estaAutenticado.mockReturnValue(false);
    irPara("/redefinir-senha/xyz789");
    renderComProviders(<App />);
    expect(screen.getByText("redefinir xyz789")).toBeInTheDocument();
  });
});

describe("portão de autenticação", () => {
  it("deslogado numa rota protegida cai no login", () => {
    mocks.estaAutenticado.mockReturnValue(false);
    irPara("/processos");
    renderComProviders(<App />);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("logado vê a tela e o menu lateral", () => {
    irPara("/clientes");
    renderComProviders(<App />);
    expect(screen.getByText("tela de clientes")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });
});

describe("deep link dos e-mails", () => {
  it("?processo= E ?comunicacao= abrem o Histórico naquela comunicação", () => {
    irPara("/?processo=123&comunicacao=99");
    renderComProviders(<App />);
    expect(screen.getByText("histórico deep:99")).toBeInTheDocument();
  });

  it("?processo= sozinho leva a Processos -- antes esse link não fazia nada", () => {
    // Formato que o backend gera quando a API do PJe não devolve o id da
    // comunicação. `parseDeepLinkHistorico` exige os dois e devolvia null,
    // então o app abria na tela inicial e ignorava o link em silêncio.
    irPara("/?processo=123");
    renderComProviders(<App />);
    expect(screen.getByText("tela de processos")).toBeInTheDocument();
  });

  it("raiz sem parâmetro nenhum É a Área de trabalho -- não redireciona", () => {
    // Ela deixou de ser um redirecionamento pra Processos quando a tela
    // passou a existir.
    irPara("/");
    renderComProviders(<App />);
    expect(screen.getByText("área de trabalho")).toBeInTheDocument();
  });
});

describe("menu lateral", () => {
  it("esconde Grupo do 'user' -- decisão de navegação, a rota segue viva", () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user");
    renderComProviders(<App />);
    expect(screen.queryByRole("link", { name: /Grupo/ })).not.toBeInTheDocument();
  });

  it("mostra Grupo pro 'manager' pra cima", () => {
    renderComProviders(<App />);
    expect(screen.getByRole("link", { name: /Grupo/ })).toBeInTheDocument();
  });

  it("não mostra item de tela ainda não construída", () => {
    renderComProviders(<App />);
    for (const pendente of ["Gestão kanban", "Agenda", "Atendimentos"]) {
      expect(screen.queryByRole("link", { name: pendente })).not.toBeInTheDocument();
    }
  });

  it("mostra Área de trabalho, que deixou de ser pendente", () => {
    renderComProviders(<App />);
    expect(screen.getByRole("link", { name: "Área de trabalho" })).toBeInTheDocument();
  });
});
