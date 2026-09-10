/** As contas puras da seleção múltipla.
 *
 * 🔴 O caso que este arquivo existe para travar: a chave é o PAR. Duas
 * tarefas de subgrupos diferentes podem ter o mesmo `tarefa_id`, e com id
 * solto a seleção apagaria a errada -- só com dois subgrupos na tela, que é
 * o caso normal da Agenda.
 */
import { describe, expect, it } from "vitest";

import {
  chaveDe,
  chavesDoIntervalo,
  contarVinculadas,
  estadoDaCaixaDoTopo,
  paraOLote,
  rotuloDeSelecao,
} from "./selecao";
import type { Tarefa } from "../types";

function tarefa(campos: Partial<Tarefa> = {}): Tarefa {
  return {
    subgrupo_id: "s1", tarefa_id: "t1", titulo: "Uma tarefa",
    data: "2026-09-10", coluna_id: "c1", prioridade: "Média",
    ...campos,
  } as Tarefa;
}

describe("chaveDe", () => {
  it("monta o par subgrupo:tarefa", () => {
    expect(chaveDe(tarefa())).toBe("s1:t1");
  });

  it("🔴 o MESMO tarefa_id em subgrupos diferentes dá chaves DIFERENTES", () => {
    const a = chaveDe(tarefa({ subgrupo_id: "civel", tarefa_id: "abc" }));
    const b = chaveDe(tarefa({ subgrupo_id: "trabalhista", tarefa_id: "abc" }));
    expect(a).not.toBe(b);
  });
});

describe("paraOLote", () => {
  it("leva a chave e o responsável que a tela viu", () => {
    expect(paraOLote([tarefa({ responsavel_id: "ana@x.com" })])).toEqual([
      { subgrupo_id: "s1", tarefa_id: "t1", responsavel_id: "ana@x.com" },
    ]);
  });

  it("sem responsável vira null -- é AFIRMAÇÃO, não omissão", () => {
    expect(paraOLote([tarefa()])[0].responsavel_id).toBeNull();
  });

  it("⚠️ string VAZIA também vira null", () => {
    /* Uma linha legada pode ter `""` gravado. Mandá-lo cru faria o corpo
       afirmar um dono que não existe. */
    expect(paraOLote([tarefa({ responsavel_id: "" })])[0].responsavel_id).toBeNull();
  });

  it("lista vazia devolve lista vazia, não quebra", () => {
    expect(paraOLote([])).toEqual([]);
  });
});

describe("contarVinculadas", () => {
  it("conta só as que ainda prendem um processo", () => {
    expect(contarVinculadas([
      tarefa({ processo_numero: "0801234-56.2026.8.19.0001" }),
      tarefa(),
      tarefa({ processo_numero: "0705566-12.2026.8.19.0002" }),
    ])).toBe(2);
  });

  it("nenhuma vinculada devolve 0 -- e é o que apaga a faixa amarela", () => {
    expect(contarVinculadas([tarefa(), tarefa()])).toBe(0);
  });

  it("processo em string vazia não conta como vínculo", () => {
    expect(contarVinculadas([tarefa({ processo_numero: "" })])).toBe(0);
  });

  it("lista vazia devolve 0", () => {
    expect(contarVinculadas([])).toBe(0);
  });
});

describe("rotuloDeSelecao", () => {
  it("concorda no singular", () => {
    expect(rotuloDeSelecao(1, 1)).toBe("1 de 1 selecionada");
  });

  it("concorda no plural", () => {
    expect(rotuloDeSelecao(3, 47)).toBe("3 de 47 selecionadas");
  });

  it("zero marcadas ainda diz o total", () => {
    /* A barra só aparece no modo de seleção, e ela precisa dizer de quantas
       se fala mesmo antes de marcar a primeira. */
    expect(rotuloDeSelecao(0, 12)).toBe("0 de 12 selecionadas");
  });
});

describe("estadoDaCaixaDoTopo", () => {
  it("nenhuma marcada é vazia", () => {
    expect(estadoDaCaixaDoTopo(0, 10)).toBe("vazia");
  });

  it("parte marcada é indeterminada -- o traço, não o tique", () => {
    expect(estadoDaCaixaDoTopo(3, 10)).toBe("indeterminada");
  });

  it("todas marcadas é marcada", () => {
    expect(estadoDaCaixaDoTopo(10, 10)).toBe("marcada");
  });

  it("⚠️ lista VAZIA é vazia, nunca marcada", () => {
    /* `0 >= 0` seria "marcada", e a caixa nasceria com tique numa lista sem
       nada -- afirmando que tudo está selecionado quando não há nada. */
    expect(estadoDaCaixaDoTopo(0, 0)).toBe("vazia");
  });

  it("🔴 marcadas com a lista VAZIA é vazia, nunca marcada", () => {
    /* Acontece quando o filtro esvazia a lista com a seleção montada. Sem a
       guarda de `total === 0`, `5 >= 0` daria "marcada" -- a caixa com tique
       cheio sobre uma lista sem nada, afirmando que tudo está selecionado.
       Foi uma mutação que passou verde que mostrou este buraco. */
    expect(estadoDaCaixaDoTopo(5, 0)).toBe("vazia");
  });

  it("mais marcadas que o total ainda é marcada, não quebra", () => {
    /* Acontece por um instante quando o filtro encolhe a lista com a
       seleção montada. */
    expect(estadoDaCaixaDoTopo(5, 3)).toBe("marcada");
  });
});

describe("chavesDoIntervalo", () => {
  const ordem = ["a", "b", "c", "d", "e"];

  it("pega o intervalo de cima para baixo, com as duas pontas", () => {
    expect(chavesDoIntervalo(ordem, "b", "d")).toEqual(["b", "c", "d"]);
  });

  it("⚠️ e de BAIXO para cima, igual", () => {
    /* Marcar de baixo para cima é tão comum quanto o contrário, e um
       intervalo que só funciona num sentido falha em silêncio. */
    expect(chavesDoIntervalo(ordem, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("a mesma âncora nos dois lados devolve uma só", () => {
    expect(chavesDoIntervalo(ordem, "c", "c")).toEqual(["c"]);
  });

  it("âncora fora da lista devolve VAZIO, nunca a lista inteira", () => {
    /* Acontece quando a página muda entre um clique e o outro. Devolver
       tudo marcaria a lista inteira sem ninguém pedir. */
    expect(chavesDoIntervalo(ordem, "sumiu", "c")).toEqual([]);
    expect(chavesDoIntervalo(ordem, "c", "sumiu")).toEqual([]);
  });

  it("ordem vazia devolve vazio", () => {
    expect(chavesDoIntervalo([], "a", "b")).toEqual([]);
  });
});
