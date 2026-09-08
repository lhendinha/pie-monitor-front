import { describe, expect, it, vi } from "vitest";

import { baixarCsv, centavosParaPlanilha, montarCsv } from "./planilha";

describe("montarCsv", () => {
  it("junta com ponto e vírgula e quebra com CRLF", () => {
    expect(montarCsv([["a", "b"], ["c", "d"]])).toBe("﻿a;b\r\nc;d");
  });

  it("🔴 começa com BOM -- sem ele o Excel lê UTF-8 como Latin-1", () => {
    /* "Honorários" viraria "HonorÃ¡rios" na planilha do escritório. */
    const csv = montarCsv([["Honorários"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Honorários");
  });

  it("🔴 o separador é `;`, e não `,`", () => {
    /* O Excel em pt-BR lê a vírgula como separador DECIMAL: com `,` o
       arquivo inteiro abre numa coluna só. */
    expect(montarCsv([["1", "2"]])).not.toContain("1,2");
    expect(montarCsv([["1", "2"]])).toContain("1;2");
  });

  it("⚠️ escapa só o que precisa: separador, aspas e quebra de linha", () => {
    expect(montarCsv([["simples"]])).toBe("﻿simples");
    expect(montarCsv([["com;ponto"]])).toBe('﻿"com;ponto"');
    expect(montarCsv([['com "aspas"']])).toBe('﻿"com ""aspas"""');
    expect(montarCsv([["duas\nlinhas"]])).toBe('﻿"duas\nlinhas"');
  });

  it("aceita número e lista vazia sem quebrar", () => {
    expect(montarCsv([[1, 2]])).toBe("﻿1;2");
    expect(montarCsv([])).toBe("﻿");
  });
});

describe("centavosParaPlanilha", () => {
  it("vira decimal com VÍRGULA -- é o que o Excel pt-BR soma", () => {
    expect(centavosParaPlanilha(123456)).toBe("1234,56");
    expect(centavosParaPlanilha(0)).toBe("0,00");
    expect(centavosParaPlanilha(5)).toBe("0,05");
  });

  it("🔴 e SEM separador de milhar", () => {
    /* `1.234,56` entra como TEXTO em algumas configurações, e coluna de
       texto não soma -- que é a única coisa que se faz com esta planilha. */
    expect(centavosParaPlanilha(123456)).not.toContain(".");
  });

  it("o negativo mantém o sinal na frente", () => {
    expect(centavosParaPlanilha(-98765)).toBe("-987,65");
  });
});

describe("baixarCsv", () => {
  it("cria o link, clica e LIMPA a url do blob", () => {
    /* ⚠️ Sem o `revoke` o blob fica preso na memória da aba até recarregar,
       e quem exporta o ano várias vezes acumula um por vez. */
    const criar = vi.fn(() => "blob:x");
    const revogar = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL: criar, revokeObjectURL: revogar });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    baixarCsv("fluxo.csv", "a;b");

    expect(criar).toHaveBeenCalled();
    expect(clique).toHaveBeenCalled();
    expect(revogar).toHaveBeenCalledWith("blob:x");
    expect(document.querySelector("a[download]")).toBeNull();
    clique.mockRestore();
    vi.unstubAllGlobals();
  });
});
