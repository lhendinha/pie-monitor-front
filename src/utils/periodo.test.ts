import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { erroDoPeriodoEmMeses, intervaloDoPeriodo, intervaloEmMeses } from "./periodo";

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

describe("os períodos do DINHEIRO", () => {
  /* ⚠️ Quarta, 19/08/2026 -- o mesmo relógio congelado do resto do arquivo. */

  it("'ano' é o ano de CALENDÁRIO, e não doze meses a partir de hoje", () => {
    // 🔴 A diferença aparece justamente em agosto: "os próximos doze meses"
    // terminaria em 2027, e o fluxo de caixa mostraria dois anos misturados.
    expect(intervaloDoPeriodo("ano")).toEqual({ de: "2026-01-01", ate: "2026-12-31" });
  });

  it("'prox7' e 'prox30' contam a partir de HOJE, em dias", () => {
    expect(intervaloDoPeriodo("prox7")).toEqual({ de: "2026-08-19", ate: "2026-08-26" });
    expect(intervaloDoPeriodo("prox30")).toEqual({ de: "2026-08-19", ate: "2026-09-18" });
  });

  it("'mespassado' é o mês inteiro anterior, não os últimos 30 dias", () => {
    /* ⚠️ É a comparação que todo escritório faz -- "quanto entrou em julho?"
       --, e ela só responde certo com o mês FECHADO. */
    expect(intervaloDoPeriodo("mespassado")).toEqual({ de: "2026-07-01", ate: "2026-07-31" });
  });

  it("'mespassado' em JANEIRO volta para dezembro do ano anterior", () => {
    /* 🔴 O par que pega erro de aritmética de mês: `mes - 1` em janeiro dá
       -1, e um cálculo ingênuo devolveria 2026-00. */
    vi.setSystemTime(new Date(2026, 0, 15, 10, 0, 0));
    expect(intervaloDoPeriodo("mespassado")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
  });

  it("'mespassado' em MARÇO acerta o fim de fevereiro", () => {
    vi.setSystemTime(new Date(2026, 2, 10, 10, 0, 0));
    expect(intervaloDoPeriodo("mespassado")).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
  });

  it("⚠️ um id que o Kanban conhece e o dinheiro não continua valendo", () => {
    /* A função é UMA para as duas telas: quem limita a lista de opções é a
       pílula, não ela. Devolver `null` aqui esconderia um período que o
       Kanban usa. */
    expect(intervaloDoPeriodo("amanha")).toEqual({ de: "2026-08-20", ate: "2026-08-20" });
  });
});

describe("intervaloEmMeses -- o período do fluxo de caixa", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-09-08T12:00:00"));
  });

  it("🔴 devolve MESES, e não datas -- o servidor recusa `aaaa-mm-dd` aqui", () => {
    const intervalo = intervaloEmMeses("esteano");
    expect(intervalo).toEqual({ de: "2026-01", ate: "2026-12" });
    expect(intervalo?.de).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("o ano passado é o ano inteiro anterior", () => {
    expect(intervaloEmMeses("anopassado")).toEqual({ de: "2025-01", ate: "2025-12" });
  });

  it("⚠️ 'últimos N' INCLUEM o mês corrente -- são N colunas terminando em hoje", () => {
    /* Sem incluir, o relatório aberto no dia 1º não mostraria nada do mês
       que está correndo. */
    expect(intervaloEmMeses("ult6meses")).toEqual({ de: "2026-04", ate: "2026-09" });
    expect(intervaloEmMeses("ult12meses")).toEqual({ de: "2025-10", ate: "2026-09" });
  });

  it("'próximos N' começam em hoje, pela mesma razão", () => {
    expect(intervaloEmMeses("prox6meses")).toEqual({ de: "2026-09", ate: "2027-02" });
    expect(intervaloEmMeses("prox12meses")).toEqual({ de: "2026-09", ate: "2027-08" });
  });

  it("o personalizado devolve o que veio, e sem ele devolve nulo", () => {
    expect(intervaloEmMeses("personalizado", { de: "2026-03", ate: "2026-05" }))
      .toEqual({ de: "2026-03", ate: "2026-05" });
    expect(intervaloEmMeses("personalizado")).toBeNull();
  });

  it("⚠️ id desconhecido devolve NULO, e não um período inventado", () => {
    /* Id de uma versão antiga guardado na URL: sem período, a API devolve o
       ano corrente, que é o padrão dela. */
    expect(intervaloEmMeses("ult7")).toBeNull();
    expect(intervaloEmMeses("")).toBeNull();
  });
});

describe("erroDoPeriodoEmMeses", () => {
  it("período bom não tem erro", () => {
    expect(erroDoPeriodoEmMeses({ de: "2026-01", ate: "2026-12" })).toBe("");
    expect(erroDoPeriodoEmMeses({ de: "2026-05", ate: "2026-05" })).toBe("");
    expect(erroDoPeriodoEmMeses(null)).toBe("");
  });

  it("🔴 recusa o invertido e o longo demais -- as DUAS regras do servidor", () => {
    /* A tela recusa antes de pedir: ir buscar um 400 para descobrir o que
       ela já sabe transforma uma correção em "Não foi possível carregar". */
    expect(erroDoPeriodoEmMeses({ de: "2026-12", ate: "2026-01" }))
      .toBe("O mês final vem antes do inicial.");
    expect(erroDoPeriodoEmMeses({ de: "2025-01", ate: "2027-01" }))
      .toBe("O período tem 25 meses; o máximo é 24.");
  });

  it("⚠️ exatamente 24 passa -- o teto é inclusivo, como o do servidor", () => {
    expect(erroDoPeriodoEmMeses({ de: "2025-01", ate: "2026-12" })).toBe("");
  });

  it("ponta faltando não é erro: quem não escolheu ainda não errou", () => {
    expect(erroDoPeriodoEmMeses({ de: "2026-01", ate: "" })).toBe("");
    expect(erroDoPeriodoEmMeses({ de: "", ate: "2026-01" })).toBe("");
  });
});
