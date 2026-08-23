import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { intervaloDoPeriodo } from "./periodo";

/** Quarta-feira, 19/08/2026. Escolhida de propósito no MEIO da semana e no
 * meio do mês: numa segunda ou no dia 1º, "esta semana" e "hoje" coincidem
 * e o teste passaria sem provar nada. */
const QUARTA = new Date(2026, 7, 19, 10, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(QUARTA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("intervaloDoPeriodo", () => {
  it("'todos' não limita nada -- é o `null` que o artifact anota", () => {
    // Já foi bug no artifact: a string virava filtro de verdade e escondia
    // o quadro inteiro.
    expect(intervaloDoPeriodo("todos")).toBeNull();
  });

  it("id desconhecido também não limita, em vez de esconder tudo", () => {
    expect(intervaloDoPeriodo("periodo-que-nao-existe")).toBeNull();
  });

  it.each([
    ["hoje", "2026-08-19", "2026-08-19"],
    ["amanha", "2026-08-20", "2026-08-20"],
    // Domingo a sábado, como o `startOfWeek` do artifact
    // (`d.getDate() - d.getDay()`). 19/08/2026 é quarta.
    ["semana", "2026-08-16", "2026-08-22"],
    ["proxsemana", "2026-08-23", "2026-08-29"],
    // Mês de CALENDÁRIO, não "daqui a 30 dias": no dia 19 termina no 31.
    ["mes", "2026-08-01", "2026-08-31"],
    ["proxmes", "2026-09-01", "2026-09-30"],
    ["prox3", "2026-08-19", "2026-08-22"],
    ["ontem", "2026-08-18", "2026-08-18"],
    ["ult7", "2026-08-12", "2026-08-19"],
    ["ult30", "2026-07-20", "2026-08-19"],
  ])("%s vai de %s a %s", (id, de, ate) => {
    expect(intervaloDoPeriodo(id)).toEqual({ de, ate });
  });

  it("os períodos passados limitam as DUAS pontas", () => {
    // É o motivo de o modelo antigo (só `dataAte`) não servir mais: sem
    // limite inferior, "Ontem" viraria "tudo até ontem".
    const ontem = intervaloDoPeriodo("ontem");
    expect(ontem?.de).toBe("2026-08-18");
    expect(ontem?.ate).toBe("2026-08-18");
  });

  it("personalizado devolve o intervalo escolhido", () => {
    const escolhido = { de: "2026-08-03", ate: "2026-09-14" };
    expect(intervaloDoPeriodo("personalizado", escolhido)).toEqual(escolhido);
  });

  it("personalizado SEM intervalo não limita -- meio de escolha não é filtro", () => {
    // O painel abre o calendário antes de a pessoa escolher as pontas; se
    // isso virasse um intervalo qualquer, o quadro esvaziava no meio da
    // escolha.
    expect(intervaloDoPeriodo("personalizado")).toBeNull();
  });

  it("vira o ano corretamente perto do fim de dezembro", () => {
    vi.setSystemTime(new Date(2026, 11, 30, 10, 0, 0));
    expect(intervaloDoPeriodo("proxmes")).toEqual({ de: "2027-01-01", ate: "2027-01-31" });
    expect(intervaloDoPeriodo("amanha")).toEqual({ de: "2026-12-31", ate: "2026-12-31" });
    expect(intervaloDoPeriodo("prox3")).toEqual({ de: "2026-12-30", ate: "2027-01-02" });
  });

  it("fevereiro de ano bissexto termina no dia 29", () => {
    vi.setSystemTime(new Date(2028, 1, 10, 10, 0, 0));
    expect(intervaloDoPeriodo("mes")).toEqual({ de: "2028-02-01", ate: "2028-02-29" });
  });
});
