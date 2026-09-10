/** As contas puras da seleção múltipla.
 *
 * 🔴 O caso que este arquivo existe para travar: a chave é o PAR. Duas
 * tarefas de subgrupos diferentes podem ter o mesmo `tarefa_id`, e com id
 * solto a seleção apagaria a errada -- só com dois subgrupos na tela, que é
 * o caso normal da Agenda.
 */
import { describe, expect, it, vi } from "vitest";

import { TETO_POR_PAGINA } from "../constants";
import {
  agruparPorOrigem,
  chaveDe,
  chavesDoIntervalo,
  contarVinculadas,
  emFatias,
  estadoDaCaixaDoTopo,
  fraseDaAtribuicao,
  fraseDaConclusao,
  fraseDoResultado,
  fraseDoStatus,
  paraOLote,
  rotuloDeSelecao,
  tocadas,
} from "./selecao";
import type { Tarefa, TarefaNaoTocada } from "../types";

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

function naoTocada(
  tarefa_id: string,
  motivo: TarefaNaoTocada["motivo"],
  extra: Partial<TarefaNaoTocada> = {},
): TarefaNaoTocada {
  return { subgrupo_id: "s1", tarefa_id, motivo, ...extra };
}

describe("fraseDoResultado (excluir)", () => {
  it("diz quantas saíram, com concordância", () => {
    expect(fraseDoResultado({ removidas: 1, ignoradas: [], recusadas: [] })).toBe("1 tarefa excluída.");
    expect(fraseDoResultado({ removidas: 3, ignoradas: [], recusadas: [] })).toBe("3 tarefas excluídas.");
  });

  it("🔴 diz quantas FICARAM e por quê -- as duas razões são diferentes", () => {
    /* Estava sem teste unitário desde a Fase 3: só as telas a cobriam. */
    expect(fraseDoResultado({
      removidas: 2,
      recusadas: [naoTocada("a", "responsavel_mudou")],
      ignoradas: [naoTocada("b", "nao_existe"), naoTocada("c", "nao_existe")],
    })).toBe("2 tarefas excluídas. 1 ficou: o responsável mudou enquanto você escolhia. 2 já não existiam.");
  });
});

describe("fraseDaConclusao", () => {
  it("conta as concluídas", () => {
    expect(fraseDaConclusao({ concluidas: 3, ignoradas: [], recusadas: [] })).toBe("3 tarefas concluídas.");
  });

  it("⚠️ a que já estava concluída não é erro -- é dita à parte", () => {
    expect(fraseDaConclusao({
      concluidas: 2, recusadas: [], ignoradas: [naoTocada("a", "ja_concluida")],
    })).toBe("2 tarefas concluídas. 1 já estava concluída.");
  });

  it("🔴 subgrupo sem coluna de conclusão diz POR QUE a tarefa ficou", () => {
    expect(fraseDaConclusao({
      concluidas: 0, recusadas: [], ignoradas: [naoTocada("a", "sem_coluna_de_conclusao")],
    })).toBe("0 tarefas concluídas. 1 ficou: o quadro do subgrupo não tem coluna de conclusão.");
  });

  it("⚠️ motivo de OUTRA ação não vaza para esta frase", () => {
    /* A frase separa por motivo, e não conta a lista inteira: "1 já estava
       concluída" para uma que só estava na coluna seria mentira. */
    expect(fraseDaConclusao({
      concluidas: 1, recusadas: [], ignoradas: [naoTocada("a", "ja_na_coluna")],
    })).toBe("1 tarefa concluída.");
  });
});

describe("fraseDoStatus", () => {
  it("🔴 segue a palavra do botão: 'agora estão em', nunca 'movidas'", () => {
    const frase = fraseDoStatus({ movidas: 4, ignoradas: [], recusadas: [] }, "Em andamento");
    expect(frase).toBe("4 tarefas agora estão em “Em andamento”.");
    expect(frase).not.toMatch(/movid/i);
  });

  it("concorda no singular", () => {
    expect(fraseDoStatus({ movidas: 1, ignoradas: [], recusadas: [] }, "Feito"))
      .toBe("1 tarefa agora está em “Feito”.");
  });

  it("as que já estavam lá são ditas à parte", () => {
    expect(fraseDoStatus({ movidas: 4, recusadas: [], ignoradas: [naoTocada("a", "ja_na_coluna")] }, "Em andamento"))
      .toBe("4 tarefas agora estão em “Em andamento”. 1 já estava.");
  });
});

describe("fraseDaAtribuicao", () => {
  it("diz a quem", () => {
    expect(fraseDaAtribuicao({ atribuidas: 5, impedidas: [], ignoradas: [], recusadas: [] }, "Ana"))
      .toBe("5 tarefas atribuídas a Ana.");
  });

  it("sem nome é devolver ao pool", () => {
    expect(fraseDaAtribuicao({ atribuidas: 2, impedidas: [], ignoradas: [], recusadas: [] }, null))
      .toBe("2 tarefas devolvidas ao pool.");
  });

  it("🔴 as impedidas dizem ONDE pedir acesso", () => {
    const impedidas = [
      naoTocada("a", "nao_e_membro", { subgrupo_nome: "Trabalhista" }),
      naoTocada("b", "nao_e_membro", { subgrupo_nome: "Trabalhista" }),
    ];
    expect(fraseDaAtribuicao({ atribuidas: 3, impedidas, ignoradas: [], recusadas: [] }, "Ana"))
      .toBe("3 tarefas atribuídas a Ana. 2 ficaram de fora: não é membro de Trabalhista.");
  });

  it("dois subgrupos se juntam como gente escreve", () => {
    const impedidas = [
      naoTocada("a", "nao_e_membro", { subgrupo_nome: "Cível" }),
      naoTocada("b", "nao_e_membro", { subgrupo_nome: "Trabalhista" }),
    ];
    expect(fraseDaAtribuicao({ atribuidas: 0, impedidas, ignoradas: [], recusadas: [] }, "Ana"))
      .toBe("0 tarefas atribuídas a Ana. 2 ficaram de fora: não é membro de Cível e Trabalhista.");
  });

  it("⚠️ sem o nome do subgrupo, cai no id -- pior nome, nunca buraco", () => {
    const impedidas = [naoTocada("a", "nao_e_membro", { subgrupo_id: "s9" })];
    expect(fraseDaAtribuicao({ atribuidas: 0, impedidas, ignoradas: [], recusadas: [] }, "Ana"))
      .toBe("0 tarefas atribuídas a Ana. 1 ficou de fora: não é membro de s9.");
  });

  it("quem já era o responsável é dito sem gênero", () => {
    /* O sistema não guarda o gênero de ninguém: "essa pessoa", nunca "dela". */
    const ignoradas = [naoTocada("a", "ja_e_o_responsavel")];
    const comNome = fraseDaAtribuicao({ atribuidas: 0, impedidas: [], ignoradas, recusadas: [] }, "Ana");
    expect(comNome).toBe("0 tarefas atribuídas a Ana. 1 já estava com essa pessoa.");
    expect(comNome).not.toMatch(/\bdel[ae]\b/);
    expect(fraseDaAtribuicao({ atribuidas: 0, impedidas: [], ignoradas, recusadas: [] }, null))
      .toBe("0 tarefas devolvidas ao pool. 1 já estava sem responsável.");
  });
});

describe("tocadas", () => {
  const a = tarefa({ tarefa_id: "a" });
  const b = tarefa({ tarefa_id: "b" });
  const c = tarefa({ tarefa_id: "c" });

  it("🔴 tira as que voltaram sem ser tocadas -- é a base do Desfazer", () => {
    /* Desfazer sobre as ENVIADAS tiraria da conclusão uma tarefa que já estava
       concluída antes. */
    expect(tocadas([a, b, c], [naoTocada("b", "ja_concluida")])).toEqual([a, c]);
  });

  it("⚠️ compara pelo PAR, não pelo id solto", () => {
    const deS1 = tarefa({ subgrupo_id: "s1", tarefa_id: "t1" });
    const deS2 = tarefa({ subgrupo_id: "s2", tarefa_id: "t1" });
    expect(tocadas([deS1, deS2], [{ subgrupo_id: "s2", tarefa_id: "t1", motivo: "ja_na_coluna" }]))
      .toEqual([deS1]);
  });

  it("sem nada fora, devolve todas; sem nada enviado, devolve vazio", () => {
    expect(tocadas([a, b], [])).toEqual([a, b]);
    expect(tocadas([], [naoTocada("a", "nao_existe")])).toEqual([]);
  });
});

describe("agruparPorOrigem", () => {
  it("uma chamada por origem: agrupa pela coluna de onde a tarefa saiu", () => {
    const x = tarefa({ tarefa_id: "x", coluna_id: "c1" });
    const y = tarefa({ tarefa_id: "y", coluna_id: "c2" });
    const z = tarefa({ tarefa_id: "z", coluna_id: "c1" });
    const grupos = agruparPorOrigem([x, y, z], (t) => t.coluna_id);
    expect([...grupos.keys()]).toEqual(["c1", "c2"]);
    expect(grupos.get("c1")).toEqual([x, z]);
    expect(grupos.get("c2")).toEqual([y]);
  });

  it("vazio devolve mapa vazio", () => {
    expect(agruparPorOrigem([], (t) => t.coluna_id).size).toBe(0);
  });
});

describe("emFatias", () => {
  const vazio = () => ({ quantas: 0, itens: [] as string[] });

  it("🔴 soma número e concatena lista", async () => {
    const pedir = vi.fn(async (fatia: number[]) => ({ quantas: fatia.length, itens: [`f${fatia[0]}`] }));
    const itens = Array.from({ length: TETO_POR_PAGINA + 50 }, (_, i) => i);

    const total = await emFatias(itens, vazio(), pedir);

    expect(pedir).toHaveBeenCalledTimes(2);
    expect(total).toEqual({ quantas: TETO_POR_PAGINA + 50, itens: ["f0", `f${TETO_POR_PAGINA}`] });
  });

  it("⚠️ vai em SÉRIE: nunca duas fatias ao mesmo tempo", async () => {
    let emVoo = 0;
    let pico = 0;
    const pedir = async (fatia: number[]) => {
      emVoo += 1;
      pico = Math.max(pico, emVoo);
      await new Promise((r) => setTimeout(r, 0));
      emVoo -= 1;
      return { quantas: fatia.length, itens: [] as string[] };
    };
    await emFatias(Array.from({ length: TETO_POR_PAGINA * 3 }, (_, i) => i), vazio(), pedir);
    expect(pico).toBe(1);
  });

  it("🔴 falha no meio PROPAGA e para as seguintes", async () => {
    /* A tela não pode afirmar um número que o servidor não confirmou. */
    const pedir = vi.fn()
      .mockResolvedValueOnce({ quantas: TETO_POR_PAGINA, itens: [] })
      .mockRejectedValueOnce(new Error("500"));
    const itens = Array.from({ length: TETO_POR_PAGINA * 3 }, (_, i) => i);

    await expect(emFatias(itens, vazio(), pedir)).rejects.toThrow("500");
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it("lista vazia não chama e devolve o vazio", async () => {
    const pedir = vi.fn();
    expect(await emFatias([], vazio(), pedir)).toEqual(vazio());
    expect(pedir).not.toHaveBeenCalled();
  });
});
