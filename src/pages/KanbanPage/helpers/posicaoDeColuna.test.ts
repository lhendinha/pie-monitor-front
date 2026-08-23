import { describe, expect, it } from "vitest";

import { posicaoValidaNoQuadro } from "./posicaoDeColuna";

/** [comum, comum, conclusão] -- a conclusão no índice 2. */
const QUADRO = [
  { e_conclusao: false },
  { e_conclusao: false },
  { e_conclusao: true },
];

describe("posicaoValidaNoQuadro", () => {
  it("posição antes da conclusão passa intacta", () => {
    expect(posicaoValidaNoQuadro(0, QUADRO)).toBe(0);
    expect(posicaoValidaNoQuadro(1, QUADRO)).toBe(1);
  });

  it("soltar EM CIMA da conclusão trunca pro lugar anterior", () => {
    /* O `dnd-kit` deixa soltar ali: `disabled` no `useSortable` impede
     * arrastar a conclusão, não impede as outras de irem pro lugar dela. */
    expect(posicaoValidaNoQuadro(2, QUADRO)).toBe(1);
  });

  it("soltar DEPOIS da conclusão também trunca", () => {
    /* Medido no navegador antes desta trava: arrastar "A Fazer" pro fim
     * mandava `ordem: 4` com a conclusão em 3, e o servidor devolvia 409 --
     * o gesto era oferecido e a requisição nascia condenada. */
    expect(posicaoValidaNoQuadro(3, QUADRO)).toBe(1);
    expect(posicaoValidaNoQuadro(99, QUADRO)).toBe(1);
  });

  it("com a conclusão em PRIMEIRO, o teto é 0 e não -1", () => {
    // Quadro legado, fora do invariante. `-1` viraria índice inválido e o
    // `arrayMove` jogaria a coluna pro fim -- o oposto do pretendido.
    expect(posicaoValidaNoQuadro(2, [{ e_conclusao: true }, { e_conclusao: false }])).toBe(0);
  });

  it("quadro sem conclusão nenhuma aceita qualquer posição", () => {
    // Não deveria existir, mas truncar em `-1` aqui quebraria o arraste
    // inteiro em vez de degradar.
    expect(posicaoValidaNoQuadro(2, [{ e_conclusao: false }, { e_conclusao: false }])).toBe(2);
  });
});
