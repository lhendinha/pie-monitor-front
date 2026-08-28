import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";
import type { Processo } from "../../../../types";

const mocks = vi.hoisted(() => ({
  /* `CampoDeClientes` passou a oferecer "cadastrar" só a `manager`+ -- ele lê
     o papel da sessão, e sem este mock o módulo inteiro falha ao carregar. */
  papelAtende: vi.fn(() => true),
  /* A assinatura vai explícita: `vi.fn(async () => …)` infere ZERO
     parâmetros, e aí `mock.calls[0][3]` não compila. */
  atualizarProcesso: vi.fn(
    async (
      _subgrupoId: string,
      _numero: string,
      _apelido: string,
      _campos: Record<string, unknown>,
    ) => ({}),
  ),
  listarMembrosDoSubgrupo: vi.fn(async () => ({
    membros: [
      { email: "ana@x.com", apelido: "Ana" },
      { email: "bruno@x.com", apelido: "Bruno" },
    ],
    total: 2,
  })),
  listarOpcoesProcesso: vi.fn(async () => ({ opcoes: [] })),
  listarClientes: vi.fn(async () => ({ clientes: [], total: 0 })),
}));

vi.mock("../../../../services", () => mocks);

import FormularioProcesso from "./index";

/** O formulário de edição do processo.
 *
 * 🔴 Este arquivo nasce de uma perda de dado relatada em produção. O
 * formulário semeava oito campos e esquecia `responsaveis`: o campo abria
 * VAZIO num processo que tem responsável, e o salvamento mandava
 * `responsaveis: []`. Quem escolhesse alguém só para passar do erro
 * substituía quem estava lá, sem aviso.
 */
const PROCESSO: Processo = {
  subgrupo_id: "sg-1",
  numero_processo: "50005619720258130559",
  apelido: "Reintegração de Posse",
  cliente_ids: ["c1"],
  cliente_nomes: ["SONIA MARIA ALVES"],
  responsaveis: ["ana@x.com"],
  responsaveis_nomes: ["Ana"],
  objeto_assunto: "posse",
  proxima_providencia: "",
  data_verificar: "",
  prazo_final: "",
  observacoes: "",
  fase_id: "",
  situacao_id: "",
};

function montar(processo: Partial<Processo> = {}) {
  return renderComProviders(
    <FormularioProcesso
      processo={{ ...PROCESSO, ...processo }}
      subgrupoNome="Cível"
      faseRotulo=""
      situacaoRotulo=""
      onSalvo={vi.fn()}
      onRemover={vi.fn()}
    />,
  );
}

const salvar = () => screen.getByRole("button", { name: /^Salvar$/ });

beforeEach(() => {
  mocks.atualizarProcesso.mockClear();
});

describe("o formulário abre com o que está GRAVADO", () => {
  it("🔴 mostra quem responde -- o campo abria vazio", async () => {
    montar();
    expect(await screen.findByText("Ana")).toBeInTheDocument();
  });

  it("mostra os clientes", () => {
    montar();
    expect(screen.getByText("SONIA MARIA ALVES")).toBeInTheDocument();
  });
});

describe("o que o salvamento manda", () => {
  it("🔴 sem tocar em nada, NÃO manda campo nenhum", async () => {
    /* O par que prova a correção inteira: antes iam os nove campos, com
       `responsaveis: []` no meio. */
    montar();
    await userEvent.setup().click(salvar());

    await waitFor(() => expect(mocks.atualizarProcesso).toHaveBeenCalled());
    expect(mocks.atualizarProcesso).toHaveBeenCalledWith(
      "sg-1",
      "50005619720258130559",
      "Reintegração de Posse",
      {},
    );
  });

  it("manda SÓ o campo tocado", async () => {
    montar();
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/Objeto/), " nova");
    await usuario.click(salvar());

    await waitFor(() => expect(mocks.atualizarProcesso).toHaveBeenCalled());
    const [, , , campos] = mocks.atualizarProcesso.mock.calls[0];
    expect(Object.keys(campos)).toEqual(["objetoAssunto"]);
  });

  it("🔴 NÃO reenvia os responsáveis de quem não os tocou", async () => {
    /* Reenviar a lista inalterada faz o servidor rodar a régua de "tirar
       OUTRA pessoa" à toa -- e era por essa porta que a lista velha voltava
       por cima do que outra pessoa tinha mudado. */
    montar();
    const usuario = userEvent.setup();
    await usuario.clear(screen.getByLabelText(/Apelido/));
    await usuario.type(screen.getByLabelText(/Apelido/), "Outro apelido");
    await usuario.click(salvar());

    await waitFor(() => expect(mocks.atualizarProcesso).toHaveBeenCalled());
    const [, , apelido, campos] = mocks.atualizarProcesso.mock.calls[0];
    expect(apelido).toBe("Outro apelido");
    expect(campos).not.toHaveProperty("responsaveis");
  });
});
