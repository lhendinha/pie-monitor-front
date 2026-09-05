/** O medidor da movimentação, provado antes de ser usado -- o irmão de
 * `api/tests/test_conferir_movimentacao.py`.
 *
 * 🔴 Um medidor que dissesse `OK` para tudo passaria a refatoração inteira em
 * silêncio. Por isso ele é provado nos dois sentidos: o caso sintético que
 * tem de dar `OK` (função, componente com comentário entre chaves no JSX,
 * `interface` e `type` movidos, renomeados e agora exportados) e o par
 * negativo, com um `+`
 * trocado por `-` no corpo movido.
 *
 * ➡️ Regra do `api/CONTEXT.md`, *"O MEDIDOR também erra -- e erra calado"*.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts/conferirMovimentacao.mjs");

const ANTES = `/** doc do módulo */
import { useState } from "react";
const LIMITE = 3;
/** velha */
function _ajuda(x: number) {
  // soma
  return x + LIMITE;
}
interface _Props { a: number }
type _Modo = "um" | "dois";
export default function Tela({ a }: _Props) {
  const [n] = useState(0);
  /* decisão */
  return (<div>{/* comentário no JSX */}<span>{_ajuda(a) + n}</span></div>);
}
`;

const TELA_DEPOIS = `/** doc mudou */
import { useState } from "react";
import { ajuda } from "./ajuda";
import type { Props, Modo } from "./types";
export default function Tela({ a }: Props) {
  const [n] = useState(0);
  return (<div><span>{ajuda(a) + n}</span></div>);
}
`;

const AJUDA_DEPOIS = `export const LIMITE = 3;
export function ajuda(x: number) {
  return x + LIMITE;
}
`;

const TYPES_DEPOIS = `export interface Props { a: number }
export type Modo = "um" | "dois";
`;

function montar(ajuda: string = AJUDA_DEPOIS): string[] {
  const raiz = mkdtempSync(join(tmpdir(), "prova-"));
  mkdirSync(join(raiz, "antes"));
  mkdirSync(join(raiz, "depois"));
  writeFileSync(join(raiz, "antes/Tela.tsx"), ANTES);
  writeFileSync(join(raiz, "depois/Tela.tsx"), TELA_DEPOIS);
  writeFileSync(join(raiz, "depois/ajuda.ts"), ajuda);
  writeFileSync(join(raiz, "depois/types.ts"), TYPES_DEPOIS);
  return [
    "--antes", join(raiz, "antes/Tela.tsx"),
    "--depois", join(raiz, "depois/Tela.tsx"), join(raiz, "depois/ajuda.ts"), join(raiz, "depois/types.ts"),
    // A vírgula final é a que um `tr` deixa: o script a descarta.
    "--renomeios", "_ajuda=ajuda,_Props=Props,_Modo=Modo,",
  ];
}

function rodar(argv: string[]): { codigo: number; saida: string } {
  try {
    return { codigo: 0, saida: execFileSync("node", [SCRIPT, ...argv], { encoding: "utf8" }) };
  } catch (erro) {
    const e = erro as { status: number; stdout: string };
    return { codigo: e.status, saida: e.stdout };
  }
}

describe("conferirMovimentacao", () => {
  it("movimentação com renomeio, export novo e prosa trocada dá OK", () => {
    const { codigo, saida } = rodar(montar());
    expect(saida.trim()).toBe("OK: 5 declarações idênticas");
    expect(codigo).toBe(0);
  });

  it("🔴 o par negativo: um `+` trocado por `-` no corpo movido sai com 1 e diz QUAL", () => {
    const { codigo, saida } = rodar(montar(AJUDA_DEPOIS.replace("x + LIMITE", "x - LIMITE")));
    expect(codigo).toBe(1);
    expect(saida).toContain("MUDOU: _ajuda");
  });

  it("declaração que some é acusada, e não engolida pela renomeação", () => {
    const { codigo, saida } = rodar(montar(AJUDA_DEPOIS.replace("export const LIMITE = 3;\n", "")));
    expect(codigo).toBe(1);
    expect(saida).toContain("SUMIU: LIMITE");
  });

  it("instrução sem nome no topo é comparada pelo CONTEÚDO, em qualquer caminho", () => {
    const raiz = mkdtempSync(join(tmpdir(), "prova-"));
    const anonimo = `try {\n  x();\n} catch {\n  y();\n}\nconst [A, B] = par();\n`;
    writeFileSync(join(raiz, "a.ts"), `/** doc */\n${anonimo}`);
    mkdirSync(join(raiz, "outra"));
    writeFileSync(join(raiz, "outra/b.ts"), `/** doc maior\n *\n * com mais linhas\n */\n${anonimo}`);
    expect(rodar(["--antes", join(raiz, "a.ts"), "--depois", join(raiz, "outra/b.ts")]).saida.trim())
      .toBe("OK: 2 declarações idênticas");

    writeFileSync(join(raiz, "outra/b.ts"), anonimo.replace("y()", "z()"));
    const { codigo, saida } = rodar(["--antes", join(raiz, "a.ts"), "--depois", join(raiz, "outra/b.ts")]);
    expect(codigo).toBe(1);
    expect(saida).toContain("SUMIU: <TryStatement:");
    expect(saida).toContain("APARECEU: <TryStatement:");
  });

  it("a mesma declaração em dois arquivos DEPOIS é DUPLICADO", () => {
    const argv = montar();
    const depoisTypes = argv[argv.indexOf("--depois") + 3];
    writeFileSync(depoisTypes, `${TYPES_DEPOIS}export function ajuda(x: number) { return x + 3; }\n`);
    const { codigo, saida } = rodar(argv);
    expect(codigo).toBe(1);
    expect(saida).toContain("DUPLICADO: _ajuda");
  });
});
