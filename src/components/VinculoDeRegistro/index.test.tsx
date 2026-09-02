import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarProcessos: vi.fn(async () => ({
    processos: [{ numero_processo: "00002668720218130559", apelido: "Caso Alfa" }],
    total: 1,
  })),
  listarAtendimentos: vi.fn(async () => ({ atendimentos: [], total: 0 })),
}));

vi.mock("../../services", () => mocks);

import VinculoDeRegistro from "./index";
import Modal from "../Modal";

/** 🔴 O Escape com o painel aberto fecha O PAINEL, não o modal atrás.
 *
 * Mesma régua já aplicada no `Select` e no `SeletorData` -- a camada de cima
 * consome o Escape. Este campo ficou de fora daquela correção, e vive dentro
 * do `ModalDeTarefa` e do `ModalDeDocumento`, os dois formulários mais longos
 * do sistema: dispensar a lista fechava tudo e levava o que já fora digitado.
 *
 * ⚠️ A busca tem espera (`ESPERA_DA_BUSCA_MS`) e mínimo de caracteres
 * (`MINIMO_PRA_BUSCAR`), então o painel só aparece depois que o termo assenta
 * -- por isso o `findByText` antes do Escape, e não um `keyboard` direto.
 */
function montarNoModal() {
  const aoFechar = vi.fn();
  renderComProviders(
    <Modal titulo="Nova tarefa" onFechar={aoFechar} descarte="semFormulario">
      <VinculoDeRegistro
        id="vinculo"
        valor={{ processo: null, atendimento: null }}
        onMudar={vi.fn()}
      />
    </Modal>,
  );
  return aoFechar;
}

const campo = () => screen.getByRole("combobox");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("o Escape com o painel aberto", () => {
  it("fecha o PAINEL, e não o modal atrás", async () => {
    const usuario = userEvent.setup();
    const aoFechar = montarNoModal();

    await usuario.type(campo(), "266");
    await screen.findByText(/Caso Alfa/);

    await usuario.keyboard("{Escape}");

    expect(aoFechar).not.toHaveBeenCalled();
    expect(screen.queryByText(/Caso Alfa/)).not.toBeInTheDocument();
  });

  it("SEM painel na tela, o Escape continua fechando o modal", async () => {
    /* O par negativo, e aqui ele guarda mais que o de sempre: a condição é
       `mostrarPainel`, não `aberto`. Um campo focado sem termo de busca não
       tem nada na tela -- engolir o Escape ali deixaria a pessoa sem saída. */
    const usuario = userEvent.setup();
    const aoFechar = montarNoModal();

    await usuario.click(campo());
    await usuario.keyboard("{Escape}");

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});
