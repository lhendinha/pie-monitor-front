import { describe, expect, it } from "vitest";

import { emDias, hojeISO } from "../../../utils";
import { janelaDoPeriodo } from "./janelaDoPeriodo";

describe("janelaDoPeriodo", () => {
  it("'Todos os períodos' é null e devolve janela VAZIA", () => {
    // Controle do bug que o artifact anota: com a string "todos" no lugar
    // do null, o valor virava filtro de verdade e escondia o quadro.
    expect(janelaDoPeriodo(null)).toEqual({});
  });

  it("'Hoje' limita no próprio dia", () => {
    expect(janelaDoPeriodo(0)).toEqual({ dataAte: hojeISO() });
  });

  it("'Esta semana' limita em 7 dias", () => {
    expect(janelaDoPeriodo(7)).toEqual({ dataAte: emDias(7) });
  });

  it("nunca limita o INÍCIO -- tarefa vencida continua no quadro", () => {
    // O quadro é sobre o que há pela frente, e o que venceu e não foi feito
    // é justamente o que mais precisa aparecer.
    for (const dias of [0, 7, 30]) {
      expect(janelaDoPeriodo(dias).dataDe).toBeUndefined();
    }
  });
});
