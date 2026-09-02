import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import Botao from "../Botao";
import Modal from "../Modal";
import RodapeDeFormulario from "./index";

/** O rodapé precisa de um `Modal` em volta: é dele que o `BotaoDeCancelar`
 * pega o pedido de fechar. */
function montar(salvando?: boolean) {
  renderComProviders(
    <Modal titulo="Nova tarefa" onFechar={vi.fn()} descarte={{ mudou: true }}>
      {/* O rodapé de verdade vai na prop `rodape`; aqui dentro do corpo serve
          igual, e deixa o teste sobre o rodapé, não sobre o Modal. */}
      <RodapeDeFormulario salvando={salvando}>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
      </RodapeDeFormulario>
    </Modal>,
  );
}

const cancelar = () => screen.getByRole("button", { name: "Cancelar" });

describe("RodapeDeFormulario", () => {
  it("🔴 enquanto SALVA, o Cancelar também trava", async () => {
    /* A razão de o componente existir. Sem isto, clicar "Cancelar" durante um
       envio fecha o modal e a mutation SEGUE: no `ModalDeDocumento` o upload
       de 20 MB continua e o documento nasce mesmo assim, sem ninguém na tela
       para ver. Só o `ModalDaInscricao` fazia isso à mão. */
    montar(true);

    expect(cancelar()).toBeDisabled();
  });

  it("parado, o Cancelar responde", async () => {
    /* O par negativo: sem ele, um Cancelar sempre travado -- que prenderia a
       pessoa no modal -- passaria no teste acima. */
    montar(false);

    expect(cancelar()).toBeEnabled();
  });

  it("sem a prop, o Cancelar responde", async () => {
    /* `salvando` é opcional: um formulário sem mutation em voo não deve
       precisar dizer nada para o botão funcionar. */
    montar();

    expect(cancelar()).toBeEnabled();
  });
});
