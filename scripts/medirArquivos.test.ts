/** A régua de medição, provada num arquivo sintético com números conhecidos.
 *
 * ⚠️ Sem isto, a tabela do plano poderia sair de um leitor que conta errado
 * -- e ninguém saberia, porque não há segunda régua para comparar.
 */
import { describe, expect, it } from "vitest";

import { medirArquivo } from "./medirArquivos.mjs";

const FONTE = `/** doc do módulo
 * 🔴 uma regra
 */
import x from "y";

// comentário de linha com data 01/02/2026
// segunda linha da mesma sequência
const A = 1;

/* bloco com 🔴 duas 🔴 vezes e número medido em 03/04/2026 */
export default function Tela() {
  return (<div>{/* jsx */}<span>{A}</span></div>);
}
`;

describe("medirArquivo", () => {
  it("conta prosa, código, diário, blocos e docstring como o plano define", () => {
    const m = medirArquivo(FONTE);
    // 3 linhas do JSDoc, 2 de `//`, 1 do bloco. O comentário entre chaves do
    // JSX está numa linha que COMEÇA com `return`: conta como código -- a régua
    // é por linha, e é a mesma que o plano usou.
    expect(m.prosa).toBe(6);
    expect(m.codigo).toBe(5); // import, const, function, return, }
    expect(m.diario).toBe(1); // só a data sem "medi"
    // JSDoc, a sequência de `//`, o bloco, e o comentário entre chaves do JSX
    // -- que é bloco de comentário para a régua, mesmo numa linha de código.
    expect(m.blocos).toBe(4);
    expect(m.blocosComMaisDeUmVermelho).toBe(1);
    expect(m.comDocstring).toBe(true);
  });

  it("arquivo sem prosa nenhuma dá zero em tudo e sem docstring", () => {
    const m = medirArquivo("export const A = 1;\n");
    expect([m.prosa, m.diario, m.blocos, m.comDocstring]).toEqual([0, 0, 0, false]);
  });
});
