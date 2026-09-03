import { screen, waitFor, within } from "@testing-library/react";
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

describe("a coluna Subgrupo", () => {
  it("🔴 existe, vem DEPOIS de Vínculo e mostra a etiqueta com o nome", async () => {
    /* A posição não é decorativa: o subgrupo qualifica o vínculo -- "Vínculo"
       diz a que processo o documento pertence, o subgrupo diz de onde esse
       processo é. No fim da linha, o olho teria de atravessar tudo e voltar.

       ⚠️ O discriminador é o `title`, que é o que `EtiquetasDeSubgrupo`
       promete e texto solto não tem. Cor e raio quebrariam no primeiro ajuste
       de tema sem nada estar errado. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
    });
    montar();
    await screen.findByText("peticao-inicial-assinada.pdf");

    const cabecalhos = screen.getAllByRole("columnheader").map((c) => c.textContent);
    const posicao = cabecalhos.indexOf("Subgrupo");
    expect(posicao).toBe(cabecalhos.indexOf("Vínculo") + 1);

    /* ⚠️ Escopado à CÉLULA daquela posição, e não `findByTitle` solto: o
       cenário tem vários documentos do mesmo subgrupo, e o seletor global
       casaria com todos. Assim o teste também prova que a etiqueta está na
       coluna certa, não só que existe em algum lugar da linha. */
    const primeira = screen.getAllByRole("row")[1];
    const celula = within(primeira).getAllByRole("cell")[posicao];
    expect(within(celula).getByTitle("Cível")).toHaveTextContent("Cível");
  });

  it("⚠️ o par negativo: catálogo VAZIO mostra o id, e a etiqueta não some", async () => {
    /* Sumir faria a coluna mentir -- leria como "este documento não tem
       subgrupo". Mostrar o id é feio e honesto. */
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
    montar();
    await screen.findByText("peticao-inicial-assinada.pdf");

    const posicao = screen.getAllByRole("columnheader").map((c) => c.textContent).indexOf("Subgrupo");
    const celula = within(screen.getAllByRole("row")[1]).getAllByRole("cell")[posicao];
    expect(within(celula).getByTitle("s1")).toHaveTextContent("s1");
  });

  it("🔴 guarda mecânico: o cabeçalho e cada linha têm o MESMO número de colunas", async () => {
    /* `Tabela` recebe só os NOMES das colunas; as células são de cada
       `Linha*`. Acrescentar coluna exige dois arquivos, e a divergência é
       SILENCIOSA -- o cabeçalho ganha uma coluna, as linhas não, e a tabela
       desalinha sem erro nenhum. É o modo de falha que este guarda persegue. */
    montar();
    await screen.findByText("peticao-inicial-assinada.pdf");

    const colunas = screen.getAllByRole("columnheader").length;
    for (const linha of screen.getAllByRole("row").slice(1)) {
      expect(within(linha).getAllByRole("cell")).toHaveLength(colunas);
    }
  });
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

describe("filtro por subgrupo", () => {
  /* 🔴 A régua é a mesma de Processos e Atendimentos: com UM subgrupo o
     controle não filtra nada, e controle sem efeito é pior que controle
     nenhum. */
  const DOIS = [
    { subgrupo_id: "s1", nome: "Cível" },
    { subgrupo_id: "s2", nome: "Trabalhista" },
  ];

  it("aparece quando a pessoa vê mais de um subgrupo", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: DOIS });
    montar();
    expect(await screen.findByText("Todos os subgrupos")).toBeInTheDocument();
  });

  it("NÃO aparece com um subgrupo só", async () => {
    /* O par negativo: sem ele, um filtro sempre-visível passaria no teste
       acima e ninguém notaria a pílula inútil. */
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [DOIS[0]] });
    montar();
    expect(await screen.findByText(ARQUIVO.titulo)).toBeInTheDocument();
    expect(screen.queryByText("Todos os subgrupos")).not.toBeInTheDocument();
  });

  it("escolher um subgrupo manda `subgrupoId` para a API", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: DOIS });
    montar();
    await userEvent.click(await screen.findByText("Todos os subgrupos"));
    await userEvent.click(await screen.findByText("Trabalhista"));
    await waitFor(() =>
      expect(mocks.listarDocumentos).toHaveBeenLastCalledWith(
        expect.objectContaining({ subgrupoId: "s2" }),
      ),
    );
  });
});
