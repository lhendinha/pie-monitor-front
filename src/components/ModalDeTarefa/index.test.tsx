import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  criarTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  removerTarefa: vi.fn(),
  listarQuadro: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
  listarClientes: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ModalDeTarefa from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarQuadro.mockResolvedValue({
    colunas: [{ coluna_id: "c1", nome: "A fazer", ordem: 1 }],
  });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
  });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
});

function montar() {
  renderComProviders(
    <MemoryRouter>
      <ModalDeTarefa subgrupoAtual="s1" onSalvo={vi.fn()} onFechar={vi.fn()} />
    </MemoryRouter>,
  );
}

/** 🔴 A promoção de `VinculoDaTarefa` pra `components/VinculoDeRegistro`
 * não pode mudar ESTA tela.
 *
 * O plano previa que o campo promovido ganhasse um "slot opcional de
 * cliente", desligado aqui. A decisão mudou na implementação -- `cliente`
 * não entrou no campo de jeito nenhum, porque `CampoDeClientes` já resolve
 * isso e as cardinalidades não batem (processo e atendimento são um cada;
 * cliente é lista). O motivo está escrito em `VinculoDeRegistro`.
 *
 * O que este teste trava é o resultado, que vale nas duas versões da
 * decisão: a tela de tarefa continua exatamente como estava.
 */
describe("a promoção do campo de vínculo não mudou a tarefa", () => {
  it("🔴 não ganhou campo de clientes", () => {
    montar();
    expect(screen.queryByLabelText(/^Clientes/)).not.toBeInTheDocument();
  });

  it("continua com o campo de vínculo, e ele busca processo E atendimento", () => {
    montar();
    const campo = screen.getByLabelText(/Processo ou atendimento vinculado/);
    expect(campo).toHaveAttribute("placeholder", "Encontre um processo ou atendimento");
  });
});
