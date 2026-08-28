import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** Comentário que cita símbolo inexistente induz ao erro -- agora no front.
 *
 * 🔴 A API tem `test_comentarios_citam_codigo_real` desde que eu documentei
 * como verdade algo que não tinha verificado. O front não tinha o irmão, e a
 * revisão de 28/08/2026 mostrou o custo: `MembrosDoSubgrupo` prometia que
 * sair do subgrupo "SOLTA as tarefas", citando `desvincular_responsavel` --
 * função que tinha virado `transferir_responsavel` justamente porque o
 * comportamento mudou. O acervo passou a ir para o SUCESSOR, e o comentário
 * ainda descrevia o mundo anterior, ao lado do diálogo que avisa a pessoa.
 *
 * ⚠️ **Metade mecânica só.** Afirmação sobre COMPORTAMENTO -- o caso acima --
 * nenhum teste pega; essa depende de ir conferir. O que dá para automatizar
 * é o nome, e é o que este arquivo faz.
 *
 * ⚠️ **O símbolo pode ser da API**: os comentários daqui citam rota, service
 * e campo derivado do outro repositório o tempo todo. Por isso o índice lê os
 * dois, e por isso o guarda pula quando o front está sozinho.
 */

const COMENTARIO_DE_LINHA = /\/\/[^\n]*/g;
const COMENTARIO_DE_BLOCO = /\/\*[\s\S]*?\*\//g;
const ENTRE_CRASES = /`([^`\n]+)`/g;
const PARECE_SIMBOLO = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*(\(\))?$/;

/** Nome que parece do projeto e não é -- API de biblioteca, campo do DOM,
 * chave de CSS. Cada entrada foi conferida uma a uma. */
const DE_FORA = new Set([
  // React, React Query, React Router, Chakra, react-select, TypeScript
  "useDeferredValue", "useQueries", "removeQueries", "partialMatchKey",
  "setSearchParams", "setState", "BoxProps", "DateValue", "valueAsString",
  "setMonth", "periodRange", "selectOptions", "visiblePageNumbers",
  "backspaceRemovesValue", "isolatedModules", "VoidFunction", "Label",
  // DOM e CSS
  "defaultPrevented", "opener", "borderBottom", "paddingLeft", "classNames",
  "confirm", "back",
  // Nomes de ícone e de variante, não símbolos exportados
  "pencil", "trash", "bell", "plus", "olho", "olhoCortado", "semSeta",
  "success", "support",
]);

/** Citado JUSTAMENTE por não existir: "chamava-se X", "X foi REMOVIDO",
 * "substituiu X". Apagar a menção apagaria a explicação. */
const CITADO_POR_NAO_EXISTIR = new Set([
  "VinculoDaTarefa", "VinculosDaTarefa", "vinculoDaTarefa",
  "useTodosOsClientes", "carregandoQuadros", "mudarStatus", "ComunicacaoCard",
  "SUB_ABAS", "ALTURA_LISTA", "AT_STATUS_OPTIONS", "DadosDeDocumento",
  "ErroDaBusca", "FiltroDeTipo", "OpcaoDePeriodo", "OpcoesListarOpcoesProcesso",
]);

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");

/** Todo arquivo de uma árvore, com o conteúdo -- `[caminho, texto]`.
 *
 * ⚠️ `fs` e não `import.meta.glob`: o Vite recusa servir arquivo de fora da
 * raiz do projeto ("Denied ID"), e metade do índice mora no outro
 * repositório. O vitest roda em Node, então ler do disco é direto. */
function arvore(base: string, extensoes: string[]): [string, string][] {
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { recursive: true, encoding: "utf8" })
    .filter((rel) => extensoes.some((e) => rel.endsWith(e)))
    .map((rel) => path.join(base, rel))
    .filter((abs) => fs.statSync(abs).isFile())
    .map((abs) => [path.relative(RAIZ, abs), fs.readFileSync(abs, "utf8")]);
}

const FONTES = arvore(path.join(RAIZ, "front/src"), [".ts", ".tsx"]);

/** Código dos DOIS repositórios, sem os comentários -- perguntar a ele é o
 * mesmo que perguntar "este nome existe de verdade?".
 *
 * ⚠️ Sem tirar os comentários, um nome aposentado se sustentaria sozinho:
 * bastaria estar citado em outro comentário para "existir". */
const CODIGO: [string, string][] = [
  ...FONTES,
  ...arvore(path.join(RAIZ, "api/src"), [".py"]),
  ...arvore(path.join(RAIZ, "api/tests"), [".py"]),
  ...arvore(path.join(RAIZ, "front/scripts"), [".mjs"]),
];

const semComentarios = (texto: string, python: boolean) =>
  python
    ? texto.replace(/#[^\n]*/g, "")
    : texto.replace(COMENTARIO_DE_BLOCO, "").replace(COMENTARIO_DE_LINHA, "");

const PALAVRAS = new Set<string>(
  CODIGO.flatMap(([caminho, texto]) => [
    // O NOME do arquivo entra junto: um teste é citado pelo módulo, e esse
    // nome não aparece dentro de arquivo nenhum.
    caminho.split("/").pop()!.replace(/\.\w+$/, ""),
    ...(semComentarios(texto, caminho.endsWith(".py")).match(/[A-Za-z_$][\w$]*/g) ?? []),
  ]),
);

function simbolosCitados(texto: string): string[] {
  const comentarios = [
    ...(texto.match(COMENTARIO_DE_BLOCO) ?? []),
    ...(texto.match(COMENTARIO_DE_LINHA) ?? []),
  ].join("\n");
  const achados = new Set<string>();
  for (const [, bruto] of comentarios.matchAll(ENTRE_CRASES)) {
    const nome = bruto.trim().replace(/\(\)$/, "");
    if (!PARECE_SIMBOLO.test(nome)) continue;
    const ultimo = nome.split(".").pop()!;
    // Palavra única sem `_` e sem camelCase é prosa, não símbolo.
    if (!ultimo.includes("_") && !/[a-z][A-Z]/.test(ultimo) && !nome.includes(".")) continue;
    if (DE_FORA.has(ultimo) || CITADO_POR_NAO_EXISTIR.has(ultimo)) continue;
    achados.add(ultimo);
  }
  return [...achados];
}

const TEM_A_API = CODIGO.some(([caminho]) => caminho.endsWith(".py"));

describe("comentários do front citam código que existe", () => {
  it("varre a árvore de verdade -- senão passaria vazio", () => {
    expect(FONTES.length).toBeGreaterThan(300);
    expect(PALAVRAS.size).toBeGreaterThan(3000);
    // 🔴 O sentinela é MONTADO: escrito inteiro ele existiria NESTE arquivo,
    // que o índice lê, e o detector encontraria a si mesmo.
    expect(PALAVRAS.has("Zz" + "Sentinela" + "Inexistente")).toBe(false);
  });

  it.skipIf(!TEM_A_API)("nenhum símbolo citado sumiu do código", () => {
    const orfaos: Record<string, string[]> = {};
    for (const [caminho, texto] of FONTES) {
      const faltando = simbolosCitados(texto).filter((n) => !PALAVRAS.has(n));
      if (faltando.length) orfaos[caminho] = faltando.sort();
    }
    expect(
      orfaos,
      "símbolo citado em comentário que não existe no código -- corrija o nome, " +
        "ou acrescente em DE_FORA/CITADO_POR_NAO_EXISTIR com o motivo escrito",
    ).toEqual({});
  });
});
