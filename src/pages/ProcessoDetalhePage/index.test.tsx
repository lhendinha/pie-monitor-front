import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalhesProcesso: vi.fn(),
  listarTarefas: vi.fn(),
  atualizarProcesso: vi.fn(),
  removerProcesso: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ProcessoDetalhePage from "./index";

const NUMERO = "00002668720218130559";

const PROCESSO = {
  subgrupo_id: "sg1",
  numero_processo: NUMERO,
  apelido: "Meu processo",
  objeto_assunto: "Cobrança",
  fase_id: "fase-1",
  situacao_id: "sit-1",
  ultima_mov_tipo: "Conclusos para sentença",
  ultima_mov_data: "2026-08-18",
  ultima_verificacao: "2026-08-21T21:42:08Z",
};

function montar(rota = `/processos/sg1/${NUMERO}`) {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/processos" element={<div>lista de processos</div>} />
        <Route path="/processos/:subgrupoId/:numero" element={<ProcessoDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalhesProcesso.mockResolvedValue({
    numero_processo: NUMERO,
    processos: [PROCESSO],
    comunicacoes: [],
  });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [{ subgrupo_id: "sg1", nome: "Cível" }] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarTarefas.mockResolvedValue({ tarefas: [] });
  mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
    Promise.resolve({
      opcoes:
        tipo === "fase"
          ? [{ opcao_id: "fase-1", tipo: "fase", rotulo: "Conhecimento (1º Grau)", ordem: 1, ativo: true }]
          : [{ opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true }],
    }),
  );
});

describe("ProcessoDetalhePage", () => {
  it("carrega o processo a partir da URL -- sem depender da listagem", async () => {
    // É a razão de ser rota: o e-mail de lembrete manda link direto pra cá,
    // e um F5 aqui não tem listagem nenhuma pra herdar dados.
    montar();

    expect(await screen.findByLabelText("Apelido")).toHaveValue("Meu processo");
    expect(mocks.detalhesProcesso).toHaveBeenCalledWith(NUMERO);
  });

  it("mostra subgrupo, situação e fase como etiquetas no cabeçalho", async () => {
    // Escopado ao cabeçalho de propósito: os mesmos rótulos aparecem de
    // novo como valor escolhido nos selects de Fase e Situação logo abaixo.
    montar();

    const titulo = await screen.findByRole("heading", { level: 1 });
    const cabecalho = within(titulo.parentElement!);

    expect(cabecalho.getByText("Cível")).toBeInTheDocument();
    expect(cabecalho.getByText("Aguardando sentença")).toBeInTheDocument();
    expect(cabecalho.getByText("Conhecimento (1º Grau)")).toBeInTheDocument();
  });

  it("salvar envia o PATCH com os campos editados", async () => {
    mocks.atualizarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    const apelido = await screen.findByLabelText("Apelido");
    await user.clear(apelido);
    await user.type(apelido, "Apelido editado");
    await user.type(screen.getByLabelText("Objeto / assunto"), " extra");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarProcesso).toHaveBeenCalledWith(
        "sg1",
        NUMERO,
        "Apelido editado",
        expect.objectContaining({ objetoAssunto: "Cobrança extra" }),
      ),
    );
  });

  it("excluir pede confirmação no diálogo do sistema e volta pra listagem", async () => {
    // `window.confirm` não serve: é do navegador, não dá pra pôr o número
    // do processo em destaque nem avisar sobre as tarefas, e em alguns
    // navegadores dá pra silenciá-lo -- aí "Excluir" vira um clique sem
    // volta e sem pergunta.
    mocks.removerProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerProcesso).toHaveBeenCalledWith("sg1", NUMERO));
    expect(await screen.findByText("lista de processos")).toBeInTheDocument();
  });

  it("cancelar no diálogo não chama a API", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Cancelar" }));

    expect(mocks.removerProcesso).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("o diálogo avisa que as tarefas ficam sem processo", async () => {
    // Elas não somem junto -- e isso é surpresa se ninguém disser.
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        { tarefa_id: "t1", subgrupo_id: "sg1", titulo: "Protocolar réplica", data: "2026-09-01", coluna_id: "c1", prioridade: "Alta" },
      ],
    });
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("1 tarefa vinculada a ele continua existindo, mas fica sem processo."),
    ).toBeInTheDocument();
  });

  it("sem tarefa, o diálogo não mostra aviso nenhum", async () => {
    // Controle: "0 tarefas vinculadas" é ruído.
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    // Escopado ao diálogo: a página em si diz "Nenhuma tarefa vinculada a
    // este processo" logo atrás dele.
    const dialogo = within(await screen.findByRole("dialog"));

    expect(dialogo.queryByText(/tarefa/)).not.toBeInTheDocument();
  });

  it("'Voltar' devolve pra listagem", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: /Voltar/ }));

    expect(await screen.findByText("lista de processos")).toBeInTheDocument();
  });

  it("processo que saiu do subgrupo não mostra formulário vazio", async () => {
    // Acontece quando outra pessoa remove o processo enquanto esta tela
    // está aberta -- ou quando alguém cola um link de subgrupo errado.
    mocks.detalhesProcesso.mockResolvedValue({
      numero_processo: NUMERO,
      processos: [{ ...PROCESSO, subgrupo_id: "outro" }],
      comunicacoes: [],
    });
    montar();

    expect(await screen.findByText("Este processo não está mais neste subgrupo.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
  });

  it("lista as tarefas do processo -- e só as dele", async () => {
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        { tarefa_id: "t1", subgrupo_id: "sg1", titulo: "Protocolar réplica", data: "2026-09-01", coluna_id: "c1", prioridade: "Alta" },
      ],
    });
    montar();

    expect(await screen.findByText("Protocolar réplica")).toBeInTheDocument();
    // O filtro por processo é o motivo de a API ter ganhado `processo_numero`:
    // sem ele a tela pediria a lista inteira do grupo.
    expect(mocks.listarTarefas).toHaveBeenCalledWith(
      expect.objectContaining({ processoNumero: NUMERO }),
    );
  });

  it("sem tarefa vinculada, diz isso", async () => {
    montar();

    expect(
      await screen.findByText("Nenhuma tarefa vinculada a este processo."),
    ).toBeInTheDocument();
  });

  it("mostra as movimentações coletadas pelo robô", async () => {
    mocks.detalhesProcesso.mockResolvedValue({
      numero_processo: NUMERO,
      processos: [PROCESSO],
      comunicacoes: [
        {
          comunicacao_id: "c1",
          tipo_comunicacao: "Intimação",
          data_disponibilizacao: "2026-08-18",
          nome_orgao: "TJMG",
          texto: "<p>Fica intimada a parte</p>",
        },
      ],
    });
    montar();

    expect(await screen.findByText("Intimação")).toBeInTheDocument();
  });

  it("sem movimentação, diz isso em vez de mostrar lista vazia", async () => {
    montar();

    expect(
      await screen.findByText("Nenhuma movimentação registrada ainda para este processo."),
    ).toBeInTheDocument();
  });
});
