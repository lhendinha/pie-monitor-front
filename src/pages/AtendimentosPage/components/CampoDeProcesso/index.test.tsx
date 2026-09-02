import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarProcessos: vi.fn(async () => ({
    processos: [{ numero_processo: "00002668720218130559", apelido: "Caso Alfa" }],
    total: 1,
  })),
}));

vi.mock("../../../../services", () => mocks);

import CampoDeProcesso from "./index";
import Modal from "../../../../components/Modal";

/** 🔴 O Escape com a lista aberta fecha A LISTA, não o modal atrás.
 *
 * Mesma régua já aplicada no `Select` e no `SeletorData` -- a camada de cima
 * consome o Escape. Este campo ficou de fora daquela correção, e vive dentro
 * do `NovoAtendimentoForm`, onde o "1º registro" é um texto longo que não se
 * edita nem se apaga depois de salvo: perdê-lo por um Escape é caro.
 *
 * ⚠️ A busca tem espera e mínimo de caracteres, então a lista só aparece
 * depois que o termo assenta -- daí o `findByText` antes do Escape.
 */
function montarNoModal() {
  const aoFechar = vi.fn();
  renderComProviders(
    <Modal titulo="Novo atendimento" onFechar={aoFechar}>
      <CampoDeProcesso id="processo" valor={null} onMudar={vi.fn()} />
    </Modal>,
  );
  return aoFechar;
}

const campo = () => screen.getByRole("combobox");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("o Escape com a lista aberta", () => {
  it("fecha a LISTA, e não o modal atrás", async () => {
    const usuario = userEvent.setup();
    const aoFechar = montarNoModal();

    await usuario.type(campo(), "266");
    await screen.findByText(/0000266-87/);

    await usuario.keyboard("{Escape}");

    expect(aoFechar).not.toHaveBeenCalled();
    expect(screen.queryByText(/0000266-87/)).not.toBeInTheDocument();
  });

  it("SEM lista na tela, o Escape continua fechando o modal", async () => {
    /* O par negativo: a condição olha `aberto && busca`. Campo focado sem
       termo não tem nada na tela, e engolir o Escape ali prenderia a pessoa. */
    const usuario = userEvent.setup();
    const aoFechar = montarNoModal();

    await usuario.click(campo());
    await usuario.keyboard("{Escape}");

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});
