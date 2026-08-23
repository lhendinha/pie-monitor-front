import { describe, expect, it } from "vitest";

import {
  DIAS_DA_LISTA,
  dataPadraoDaNovaTarefa,
  inicioDaSemana,
  intervaloDaVisao,
  navegar,
  rotuloDoDia,
  rotuloDoPeriodo,
} from "./periodoDaAgenda";

/** Meses em JS são 0-based: 7 = agosto. */
const QUARTA_19_AGO = new Date(2026, 7, 19);

describe("inicioDaSemana", () => {
  it("volta pro domingo", () => {
    expect(inicioDaSemana(QUARTA_19_AGO).getDate()).toBe(16);
  });

  it("domingo é o próprio domingo, não a semana anterior", () => {
    const domingo = new Date(2026, 7, 16);
    expect(inicioDaSemana(domingo).getDate()).toBe(16);
  });
});

describe("intervaloDaVisao", () => {
  it("dia: as duas pontas no mesmo dia", () => {
    expect(intervaloDaVisao("dia", QUARTA_19_AGO)).toEqual({
      de: "2026-08-19",
      ate: "2026-08-19",
    });
  });

  it("semana: domingo a sábado", () => {
    expect(intervaloDaVisao("semana", QUARTA_19_AGO)).toEqual({
      de: "2026-08-16",
      ate: "2026-08-22",
    });
  });

  it("lista: 14 dias a partir da data, ela inclusa", () => {
    expect(intervaloDaVisao("lista", QUARTA_19_AGO)).toEqual({
      de: "2026-08-19",
      ate: "2026-09-01",
    });
  });

  it("mês: a GRADE inteira, não só o mês", () => {
    /* 🔴 As células de fora do mês mostram os pontinhos das tarefas delas.
     * Pedir de 01 a 31 deixaria essas células vazias sem erro nenhum --
     * agosto/2026 começa num sábado, então a primeira linha é quase toda
     * julho. */
    const intervalo = intervaloDaVisao("mes", QUARTA_19_AGO);
    expect(intervalo.de).toBe("2026-07-26");
    expect(intervalo.ate).toBe("2026-09-05");
  });
});

describe("navegar", () => {
  it("mês anda de mês em mês", () => {
    const proximo = navegar("mes", QUARTA_19_AGO, 1);
    expect([proximo.getFullYear(), proximo.getMonth()]).toEqual([2026, 8]);
  });

  it("mês NÃO pula meses partindo de um dia 31", () => {
    /* `setMonth` sobre 31/03 transborda pra 31/02 -> 03/03, e navegar do
     * mês seguinte pulava fevereiro inteiro. */
    const trintaEUm = new Date(2026, 2, 31);
    const proximo = navegar("mes", trintaEUm, 1);
    expect(proximo.getMonth()).toBe(3);
  });

  it("mês atravessa a virada do ano", () => {
    const dezembro = new Date(2026, 11, 10);
    const proximo = navegar("mes", dezembro, 1);
    expect([proximo.getFullYear(), proximo.getMonth()]).toEqual([2027, 0]);
  });

  it("semana anda 7 dias", () => {
    expect(navegar("semana", QUARTA_19_AGO, 1).getDate()).toBe(26);
    expect(navegar("semana", QUARTA_19_AGO, -1).getDate()).toBe(12);
  });

  it("dia e lista andam 1 dia", () => {
    expect(navegar("dia", QUARTA_19_AGO, 1).getDate()).toBe(20);
    expect(navegar("lista", QUARTA_19_AGO, -1).getDate()).toBe(18);
  });

  it("atravessa a virada do mês pra trás", () => {
    const primeiro = new Date(2026, 7, 1);
    const anterior = navegar("dia", primeiro, -1);
    expect([anterior.getMonth(), anterior.getDate()]).toEqual([6, 31]);
  });
});

describe("rotuloDoPeriodo", () => {
  it("semana: as duas pontas em dd/mm", () => {
    expect(rotuloDoPeriodo("semana", QUARTA_19_AGO)).toBe("16/08 – 22/08");
  });

  it("lista: diz de onde parte", () => {
    expect(rotuloDoPeriodo("lista", QUARTA_19_AGO)).toBe(
      `Próximos ${DIAS_DA_LISTA} dias a partir de 19/08`,
    );
  });

  it("dia: dia da semana por extenso", () => {
    expect(rotuloDoPeriodo("dia", QUARTA_19_AGO)).toMatch(/quarta/i);
  });
});

describe("dataPadraoDaNovaTarefa", () => {
  const hoje = new Date(2026, 7, 21);

  it("no mês corrente, HOJE ganha", () => {
    expect(dataPadraoDaNovaTarefa("mes", QUARTA_19_AGO, hoje)).toBe("2026-08-21");
  });

  it("em outro mês, a primeira data visível", () => {
    const outubro = new Date(2026, 9, 15);
    // Sem isso a tarefa nasceria com data de hoje e sumiria da tela em que
    // foi criada.
    expect(dataPadraoDaNovaTarefa("mes", outubro, hoje)).toBe(intervaloDaVisao("mes", outubro).de);
  });

  it("na visão dia, é sempre o dia à vista -- nunca hoje", () => {
    expect(dataPadraoDaNovaTarefa("dia", QUARTA_19_AGO, hoje)).toBe("2026-08-19");
  });

  it("na semana corrente, hoje ganha", () => {
    expect(dataPadraoDaNovaTarefa("semana", QUARTA_19_AGO, hoje)).toBe("2026-08-21");
  });

  it("em semana distante, o domingo dela", () => {
    const outra = new Date(2026, 8, 9);
    expect(dataPadraoDaNovaTarefa("semana", outra, hoje)).toBe("2026-09-06");
  });
});

describe("maiúscula do rótulo", () => {
  /* `text-transform: capitalize` capitalizaria cada palavra e produziria
   * "Agosto De 2026" -- por isso a maiúscula vem daqui, não do CSS. */
  it("mês: só a inicial, o 'de' fica minúsculo", () => {
    expect(rotuloDoPeriodo("mes", QUARTA_19_AGO)).toBe("Agosto de 2026");
  });

  it("dia: só a inicial", () => {
    const rotulo = rotuloDoPeriodo("dia", QUARTA_19_AGO);
    expect(rotulo.startsWith("Quarta")).toBe(true);
    expect(rotulo).toContain(" de agosto");
  });

  it("rotuloDoDia segue a mesma regra", () => {
    expect(rotuloDoDia(QUARTA_19_AGO)).toBe("Quarta-feira, 19 de agosto");
  });
});
