import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarDocumentos: vi.fn(),
  criarDocumento: vi.fn(),
  prepararEnvio: vi.fn(),
  enviarArquivo: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import DocumentosPage from "./index";

const ARQUIVO = {
  subgrupo_id: "s1",
  documento_id: "d1",
  grupo_id: "g1",
  tipo: "arquivo",
  titulo: "peticao-inicial-assinada.pdf",
  descricao: "Protocolada em 20/08",
  nome_arquivo: "peticao-inicial-assinada.pdf",
  tamanho_bytes: 1536,
  processo_numero: "00002668720218130559",
  cliente_ids: ["c1"],
  cliente_nomes: ["Construtora Alfa"],
  responsavel_id: "ana@x.com",
  responsavel_nome: "Ana Paula",
  criado_em: "2026-08-20T10:00:00+00:00",
};

/** Sem vínculo nenhum -- o par que prova que a coluna aguenta o vazio sem
 * sumir com a linha. */
const SOLTO = {
  ...ARQUIVO,
  documento_id: "d2",
  titulo: "procuracao.pdf",
  descricao: null,
  processo_numero: null,
  cliente_ids: [],
  cliente_nomes: [],
  responsavel_id: null,
  responsavel_nome: null,
};

function Espiao() {
  const { pathname } = useLocation();
  return <div data-testid="url">{pathname}</div>;
}

function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={["/documentos"]}>
      <Espiao />
      <Routes>
        <Route path="/documentos" element={<DocumentosPage />} />
        <Route
          path="/documentos/:subgrupoId/:documentoId"
          element={<div>tela do documento</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarDocumentos.mockResolvedValue({
    documentos: [ARQUIVO, SOLTO],
    total: 2,
    total_paginas: 1,
  });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
});

describe("listagem", () => {
  it("mostra título, descrição e o vínculo mais específico", async () => {
    montar();
    expect(await screen.findByText(ARQUIVO.titulo)).toBeInTheDocument();
    expect(screen.getByText("Protocolada em 20/08")).toBeInTheDocument();
    /* Processo primeiro, com o cliente embaixo: um documento ligado ao
       processo é encontrado por ele, e repetir o cliente na mesma célula só
       gasta largura. */
    expect(screen.getByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
    expect(screen.getByText("Construtora Alfa")).toBeInTheDocument();
  });

  it("aguenta a linha SEM vínculo nenhum, sem sumir com ela", async () => {
    montar();
    expect(await screen.findByText("procuracao.pdf")).toBeInTheDocument();
  });

  it("mostra o RESPONSÁVEL pelo apelido, não pelo e-mail", async () => {
    /* Derivado no servidor. Sem ele a tela baixaria a lista de pessoas do
       grupo só pra traduzir -- e essa lista só chega pra `manager` pra cima,
       então quem é `user` veria e-mail cru pra sempre. */
    montar();
    expect(await screen.findByText("Ana Paula")).toBeInTheDocument();
    expect(screen.queryByText("ana@x.com")).not.toBeInTheDocument();
  });
});

describe("abrir", () => {
  it("🔴 a linha inteira leva à tela do documento", async () => {
    /* A listagem não tem lixeira nem lápis -- as ações vivem no detalhe,
       como em Processos e Clientes. Então a linha É o caminho. */
    montar();
    await userEvent.click(await screen.findByText(ARQUIVO.titulo));
    await waitFor(() => expect(url()).toBe("/documentos/s1/d1"));
  });

  it("e pelo TECLADO também -- não há outro caminho sem mouse", async () => {
    montar();
    const linha = (await screen.findByText(ARQUIVO.titulo)).closest("tr")!;
    linha.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(url()).toBe("/documentos/s1/d1"));
  });

  it("não oferece excluir nem editar na linha", async () => {
    montar();
    await screen.findByText(ARQUIVO.titulo);
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
  });
});

describe("vazio", () => {
  it("🔴 distingue 'não existe nada' de 'sua busca não achou nada'", async () => {
    /* Confundir os dois faz a pessoa concluir que o escritório não guardou
       documento nenhum quando ela só digitou um termo que não casa. */
    mocks.listarDocumentos.mockResolvedValue({ documentos: [], total: 0, total_paginas: 1 });
    montar();

    expect(await screen.findByText("Nenhum documento adicionado ainda.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar documentos"), "zzz");
    expect(await screen.findByText("Nenhum documento com esse termo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeInTheDocument();
  });
});

describe("tipo desconhecido", () => {
  it("🔴 aparece com o rótulo CRU em vez de sumir da lista", async () => {
    /* `tipo` é string aberta no backend, pra o "documento padrão" entrar
       depois sem migração. Filtrar o que não se conhece esconderia documento
       que existe. */
    mocks.listarDocumentos.mockResolvedValue({
      documentos: [{ ...ARQUIVO, tipo: "modelo", titulo: "Contrato padrão" }],
      total: 1,
      total_paginas: 1,
    });
    montar();

    expect(await screen.findByText("Contrato padrão")).toBeInTheDocument();
    expect(screen.getByText("modelo")).toBeInTheDocument();
  });
});
