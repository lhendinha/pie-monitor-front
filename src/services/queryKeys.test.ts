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
    /* Cliente não tem mais catálogo completo -- a chave de BUSCA é que
       precisa ser alcançada pelo prefixo, senão cadastrar um cliente não
       aparece na pílula de filtro. */
    expect(invalidaria(qk.clientes({ busca: "sil" }), qk.prefixoClientes())).toBe(true);
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

  it("todo invalidateQueries usa prefixo, nunca a chave paginada", () => {
    /* ⚠️ `import.meta.glob` do Vite, não `node:fs`.
     *
     * A primeira versão importava `node:fs`/`node:path`: o vitest rodava,
     * mas `tsc -b` (que o `yarn build` chama) falhava com TS2307, porque o
     * projeto não tem `@types/node`. Teste verde e build quebrado -- e a
     * quebra só apareceria no CI ou no deploy. */
    const fontes = import.meta.glob("../**/*.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    const suspeitas: string[] = [];
    for (const [arquivo, texto] of Object.entries(fontes)) {
      if (/\.test\.tsx?$/.test(arquivo)) continue;
      const re = /invalidateQueries\(\s*\{\s*queryKey:\s*qk\.(\w+)\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(texto))) {
        if (PAGINADAS.includes(m[1])) {
          suspeitas.push(`${arquivo}: invalidateQueries com qk.${m[1]}() -- use qk.prefixo...`);
        }
      }
    }
    expect(suspeitas).toEqual([]);
  });
});
