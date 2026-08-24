import { describe, expect, it } from "vitest";
import { qk } from "./queryKeys";

/**
 * Replica o `partialMatchKey` do React Query: a chave da query casa com a
 * chave de invalidação se cada elemento desta estiver contido naquela.
 */
function invalidaria(chaveDaQuery: readonly unknown[], chaveDaInvalidacao: readonly unknown[]) {
  const contem = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a && b && typeof a === "object") {
      return !Object.keys(b as object).some(
        (k) => !contem((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
      );
    }
    return false;
  };
  if (chaveDaInvalidacao.length > chaveDaQuery.length) return false;
  return chaveDaInvalidacao.every((parte, i) => contem(chaveDaQuery[i], parte));
}

describe("invalidação alcança o catálogo completo, não só a página", () => {
  /**
   * 🔴 `qk.opcoesProcesso(tipo)` é `["opcoesProcesso", tipo, {}]`, e o
   * `partialMatchKey` compara o terceiro elemento: `{}` casa com
   * `{pagina: 1}` (objeto contra objeto) mas NÃO com a string `"todos"`.
   *
   * Renomear ou desativar uma fase em Grupo > Opções deixava de atualizar a
   * tabela de Processos e o select de "Novo processo" -- só a lista da
   * própria tela mudava. O comentário do arquivo prometia que "invalidar por
   * prefixo derruba os dois", e a chamada não usava prefixo.
   */
  it("prefixo de opções alcança a página E o catálogo completo", () => {
    const prefixo = qk.prefixoOpcoesProcesso("fase");
    expect(invalidaria(qk.opcoesProcesso("fase", { pagina: 1 }), prefixo)).toBe(true);
    expect(invalidaria(qk.todasAsOpcoes("fase"), prefixo)).toBe(true);
  });

  it("a chave de PÁGINA não alcança o catálogo completo -- é por isso que o prefixo existe", () => {
    expect(invalidaria(qk.todasAsOpcoes("fase"), qk.opcoesProcesso("fase"))).toBe(false);
  });

  it("prefixos de clientes e subgrupos alcançam os dois lados", () => {
    expect(invalidaria(qk.clientes({ pagina: 2 }), qk.prefixoClientes())).toBe(true);
    expect(invalidaria(qk.todosOsClientes(), qk.prefixoClientes())).toBe(true);
    expect(invalidaria(qk.subgrupos({ pagina: 2 }), qk.prefixoSubgrupos())).toBe(true);
    expect(invalidaria(qk.todosOsSubgrupos(), qk.prefixoSubgrupos())).toBe(true);
  });

  it("o prefixo de um tipo não derruba o catálogo do OUTRO tipo", () => {
    expect(invalidaria(qk.todasAsOpcoes("situacao"), qk.prefixoOpcoesProcesso("fase"))).toBe(false);
  });
});

describe("nenhuma invalidação usa chave de PÁGINA", () => {
  /**
   * ⚠️ O teste acima prova que o prefixo funciona; este prova que ele é
   * usado. A mutação que trocou `qk.prefixoOpcoesProcesso` por
   * `qk.opcoesProcesso` no local da chamada passava por aquele -- defeito
   * de call site não aparece em teste de chave.
   *
   * Chaves paginadas terminam num objeto de params. Invalidar por elas
   * alcança as outras páginas (objeto casa com objeto) mas nunca o catálogo
   * completo, cuja última parte é a string "todos".
   */
  const PAGINADAS = ["opcoesProcesso", "clientes", "subgrupos", "processos", "historico", "atendimentos"];

  it("todo invalidateQueries usa prefixo, nunca a chave paginada", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");

    // ⚠️ `globSync` de `node:fs` não existe no runtime do vitest aqui --
    // a primeira versão usava e o teste quebrava por TypeError, não por
    // achado. Varredura manual é chata e funciona.
    const arquivos: string[] = [];
    const percorrer = (dir: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const caminho = join(dir, item.name);
        if (item.isDirectory()) percorrer(caminho);
        else if (/\.tsx?$/.test(item.name) && !/\.test\.tsx?$/.test(item.name)) arquivos.push(caminho);
      }
    };
    percorrer("src");

    const suspeitas: string[] = [];
    for (const arquivo of arquivos) {
      const texto = readFileSync(arquivo, "utf8");
      const re = /invalidateQueries\(\s*\{\s*queryKey:\s*qk\.(\w+)\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(texto))) {
        const fn = m[1];
        if (PAGINADAS.includes(fn)) {
          suspeitas.push(`${arquivo}: invalidateQueries com qk.${fn}() -- use qk.prefixo...`);
        }
      }
    }
    expect(suspeitas).toEqual([]);
  });
});
