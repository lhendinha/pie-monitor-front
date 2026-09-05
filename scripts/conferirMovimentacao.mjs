/** Prova mecânica de que uma movimentação NÃO mudou código -- o irmão de
 * `api/scripts/conferir_movimentacao.py`, com o compilador do TypeScript.
 *
 *   node scripts/conferirMovimentacao.mjs --antes A.tsx [A2.ts ...] --depois B1.tsx [B2.ts ...] \
 *       [--renomeios velho=novo,velho2=novo2]
 *
 * Compara, por nome, cada declaração de topo dos arquivos ANTES com os DEPOIS:
 * função, componente, classe, `interface`, `type`, `enum` e `const`/`let` de
 * um nome só. Cada declaração é impressa pelo `printer` do TypeScript com
 * `removeComments`, então prosa -- JSDoc, comentário de linha, de bloco e o
 * comentário entre chaves do JSX -- não conta. O que é normalizado de propósito:
 *
 *   - `import` e reexport (`export ... from`) são ignorados: mudam por definição;
 *   - `export` e `default` são tirados da declaração: mover uma função para
 *     outro arquivo obriga a exportá-la, e isso é fronteira de módulo, não
 *     comportamento;
 *   - nome renomeado volta ao nome velho, nos identificadores e nas strings.
 *
 * Instrução de topo sem nome (`if`, `try`, chamada solta) ganha chave pelo
 * CONTEÚDO: igual passa, diferente acusa como SUMIU + APARECEU, e o caminho do
 * arquivo não entra na chave -- o antes é sempre uma cópia noutro caminho.
 *
 * Qualquer outra diferença é impressa, e o script sai com código 1 -- inclusive
 * uma declaração repetida em dois arquivos DEPOIS (`DUPLICADO`).
 *
 * 🔴 A prova não alcança código que era CORPO de uma função e vira função nova
 * (um hook extraído de dentro de um componente). Esse caso é da Fase 2 do
 * `PLANO_ARQUIVOS_MENORES.md`, e lá valem as outras três provas.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");

function args(argv) {
  const lidos = { antes: [], depois: [], renomeios: "" };
  let atual = null;
  for (const a of argv) {
    if (a === "--antes" || a === "--depois") { atual = a.slice(2); continue; }
    if (a === "--renomeios") { atual = "renomeios"; continue; }
    if (atual === "renomeios") { lidos.renomeios = a; atual = null; continue; }
    if (!atual) throw new Error(`argumento inesperado: ${a}`);
    lidos[atual].push(a);
  }
  if (!lidos.antes.length || !lidos.depois.length) {
    throw new Error("uso: --antes A.ts... --depois B.ts... [--renomeios velho=novo,...]");
  }
  return lidos;
}

const printer = ts.createPrinter({ removeComments: true });

function nomeDe(no) {
  if (ts.isFunctionDeclaration(no) || ts.isClassDeclaration(no) || ts.isInterfaceDeclaration(no)
      || ts.isTypeAliasDeclaration(no) || ts.isEnumDeclaration(no)) {
    return no.name?.text ?? null;
  }
  if (ts.isVariableStatement(no) && no.declarationList.declarations.length === 1) {
    const d = no.declarationList.declarations[0];
    return ts.isIdentifier(d.name) ? d.name.text : null;
  }
  return null;
}

/** `export`/`default` fora: fronteira de módulo não é comportamento. */
function semExport(no) {
  if (!ts.canHaveModifiers(no)) return no;
  const modificadores = (ts.getModifiers(no) ?? []).filter(
    (m) => m.kind !== ts.SyntaxKind.ExportKeyword && m.kind !== ts.SyntaxKind.DefaultKeyword,
  );
  const fabrica = ts.factory;
  if (ts.isFunctionDeclaration(no)) {
    return fabrica.updateFunctionDeclaration(no, modificadores, no.asteriskToken, no.name, no.typeParameters, no.parameters, no.type, no.body);
  }
  if (ts.isClassDeclaration(no)) return fabrica.updateClassDeclaration(no, modificadores, no.name, no.typeParameters, no.heritageClauses, no.members);
  if (ts.isInterfaceDeclaration(no)) return fabrica.updateInterfaceDeclaration(no, modificadores, no.name, no.typeParameters, no.heritageClauses, no.members);
  if (ts.isTypeAliasDeclaration(no)) return fabrica.updateTypeAliasDeclaration(no, modificadores, no.name, no.typeParameters, no.type);
  if (ts.isEnumDeclaration(no)) return fabrica.updateEnumDeclaration(no, modificadores, no.name, no.members);
  if (ts.isVariableStatement(no)) return fabrica.updateVariableStatement(no, modificadores, no.declarationList);
  return no;
}

function declaracoes(caminhos, mapaDeNomes, erros) {
  const achadas = new Map();
  for (const caminho of caminhos) {
    const fonte = readFileSync(caminho, "utf8");
    const tipo = caminho.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const arquivo = ts.createSourceFile(caminho, fonte, ts.ScriptTarget.ES2022, true, tipo);
    for (const no of arquivo.statements) {
      if (ts.isImportDeclaration(no) || ts.isImportEqualsDeclaration(no)) continue;
      if (ts.isExportDeclaration(no) && no.moduleSpecifier) continue; // reexport
      if (ts.isExportAssignment(no)) continue; // `export default X` de um nome já declarado
      let texto = printer.printNode(ts.EmitHint.Unspecified, semExport(no), arquivo).replace(/\s+/g, " ").trim();
      for (const [novo, velho] of mapaDeNomes) texto = texto.replace(new RegExp(`\\b${novo}\\b`, "g"), velho);
      let chave = nomeDe(no);
      if (chave) {
        for (const [novo, velho] of mapaDeNomes) if (chave === novo) chave = velho;
      } else {
        chave = `<${ts.SyntaxKind[no.kind]}:${createHash("sha1").update(texto).digest("hex").slice(0, 12)}>`;
      }
      if (achadas.has(chave)) erros.push(`DUPLICADO: ${chave} em ${achadas.get(chave).caminho} e ${caminho}`);
      achadas.set(chave, { caminho, texto });
    }
  }
  return achadas;
}

export function conferir(argv) {
  const { antes, depois, renomeios } = args(argv);
  const mapa = renomeios.split(",").filter(Boolean).map((par) => {
    const [velho, novo] = par.split("=");
    return [novo, velho];
  });
  const erros = [];
  const a = declaracoes(antes, mapa, erros);
  const d = declaracoes(depois, mapa, erros);
  for (const nome of [...new Set([...a.keys(), ...d.keys()])].sort()) {
    if (!d.has(nome)) erros.push(`SUMIU: ${nome} (${a.get(nome).caminho})`);
    else if (!a.has(nome)) erros.push(`APARECEU: ${nome} (${d.get(nome).caminho})`);
    else if (a.get(nome).texto !== d.get(nome).texto) erros.push(`MUDOU: ${nome} (${a.get(nome).caminho} -> ${d.get(nome).caminho})`);
  }
  return { erros, total: a.size };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const { erros, total } = conferir(process.argv.slice(2));
  if (erros.length) { console.log(erros.join("\n")); process.exit(1); }
  console.log(`OK: ${total} declarações idênticas`);
}
