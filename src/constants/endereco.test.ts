import { describe, expect, it } from "vitest";

import { UFS } from "./endereco";

/** 🔴 A lista de UFs afirmava estar em ordem alfabética e não estava.
 *
 * Doze das 27 posições vinham na ordem do IBGE (por região): `AP` antes de
 * `AM`, `PR` antes de `PE`, `SP` antes de `SE`. O comentário logo acima da
 * constante dizia *"Em ordem ALFABÉTICA"* desde sempre -- ninguém conferiu,
 * porque não havia como conferir sem contar à mão.
 *
 * ⚠️ **Quase-alfabético é pior que qualquer das duas ordens.** Numa lista
 * puramente regional o olho não espera alfabeto e procura de outro jeito;
 * numa quase-alfabética ele segue o alfabeto e tropeça exatamente onde ela
 * quebra -- e o tropeço parece erro de quem lê, não da lista.
 */
describe("a lista de UFs", () => {
  it("tem as 27 unidades da federação", () => {
    /* 🔴 O par que impede o falso "passou": uma lista vazia, ou com uma sigla
       só, passaria trivialmente na asserção de ordem abaixo. */
    expect(UFS).toHaveLength(27);
    expect(new Set(UFS).size).toBe(27);
  });

  it("está em ordem ALFABÉTICA", () => {
    expect([...UFS]).toEqual([...UFS].sort());
  });

  it("e as três trocas que existiam continuam corrigidas", () => {
    /* ⚠️ Nomeadas, e não só implícitas na asserção acima: a de cima diz QUE
       está ordenada; esta diz ONDE quebrava, para quem reintroduzir a ordem do
       IBGE entender o que quebrou em vez de ver uma lista genérica. */
    const posicao = (sigla: string) => UFS.indexOf(sigla as (typeof UFS)[number]);

    expect(posicao("AM")).toBeLessThan(posicao("AP"));
    expect(posicao("PE")).toBeLessThan(posicao("PR"));
    expect(posicao("SE")).toBeLessThan(posicao("SP"));
  });
});
