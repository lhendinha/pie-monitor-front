import { describe, expect, it } from "vitest";

import {
  concordar,
  erroDaBusca,
  estadoDoAchado,
  etiquetaDoAchado,
  quantosNoutroSubgrupo,
  resumoDaImportacao,
  rotuloDeImportar,
  selecionaveis,
} from "./importacao";
import type { ProcessoEncontrado } from "../types";

function achado(
  numero: string,
  extra: Partial<ProcessoEncontrado> = {},
): ProcessoEncontrado {
  return {
    numero_processo: numero,
    apelido: "Execução Fiscal",
    tribunal: "TJRS",
    comunicacoes: 3,
    ja_existe: false,
    noutros_subgrupos: [],
    em_outro_subgrupo: false,
    removido_antes: false,
    ...extra,
  };
}

describe("o que impede a busca de sair", () => {
  it("aceita o caminho comum", () => {
    expect(erroDaBusca("123456", "RS", "", "")).toBeNull();
  });

  it("exige o número da OAB", () => {
    expect(erroDaBusca("", "RS", "", "")).toEqual({
      campo: "numeroOab", mensagem: "Informe o número da OAB",
    });
    expect(erroDaBusca("   ", "RS", "", "")?.campo).toBe("numeroOab");
  });

  it("exige que o número seja só dígitos", () => {
    expect(erroDaBusca("12A456", "RS", "", "")?.mensagem).toContain("só dígitos");
  });

  it("🔴 exige a UF -- ela sozinha não filtra nada", () => {
    /* Medido contra o PJe: mandar só a UF é o mesmo que mandar um parâmetro
       inventado, e vem a base inteira. Aceitar essa combinação cadastraria
       processos de outra pessoa. */
    const erro = erroDaBusca("123456", "", "", "");
    expect(erro?.mensagem).toBe("Selecione a UF da OAB");
    /* ⚠️ E o CAMPO é a UF, apesar de a frase citar as duas coisas -- é o que
       a primeira versão errava ao decidir por substring. */
    expect(erro?.campo).toBe("ufOab");
  });

  it("recusa período invertido", () => {
    const erro = erroDaBusca("123456", "RS", "2024-12-31", "2024-01-01");
    expect(erro?.mensagem).toContain("não pode ser posterior");
    expect(erro?.campo).toBe("periodo");
  });

  it.each([
    ["só o início", "2024-01-01", ""],
    ["só o fim", "", "2024-12-31"],
    ["intervalo normal", "2024-01-01", "2024-12-31"],
    ["futuro", "2030-01-01", "2030-12-31"],
  ])("aceita %s", (_, de, ate) => {
    expect(erroDaBusca("123456", "RS", de, ate)).toBeNull();
  });

  it("⚠️ data futura NÃO é erro", () => {
    /* Recusá-la inventaria uma regra para poupar a pessoa de um resultado
       vazio que a tela já sabe explicar -- e "de janeiro que vem" é um jeito
       legítimo de perguntar "tem algo novo?". */
    expect(erroDaBusca("123456", "RS", "2099-01-01", "")).toBeNull();
  });
});

describe("o que dá para marcar", () => {
  it("só os que ainda não estão no subgrupo", () => {
    /* Importar nunca sobrescreve: uma caixa que não faz nada é pior que uma
       caixa ausente. */
    const lista = [achado("1"), achado("2", { ja_existe: true }), achado("3")];

    expect(selecionaveis(lista)).toEqual(["1", "3"]);
  });

  it("lista sem nada novo devolve vazio", () => {
    expect(selecionaveis([achado("1", { ja_existe: true })])).toEqual([]);
  });

  it('🔴 "removido antes" CONTINUA marcável', () => {
    /* 🔴 A marca INFORMA, não impede -- e este é o par que impede alguém
       "consertar" travando. Quem ela trava é a importação AUTOMÁTICA, que age
       sozinha; aqui há uma pessoa olhando a tela e decidindo.

       Bloquear seria parede sem saída: não existe tela para apagar a marca,
       então o processo ficaria fora do alcance para sempre, e a pessoa não
       entenderia por que o sistema esconde algo que o tribunal devolveu. */
    expect(selecionaveis([achado("1", { removido_antes: true })])).toEqual(["1"]);
  });

  it("⚠️ e os dois de outro subgrupo também", () => {
    /* O mesmo princípio, e já valia antes: só o do destino trava, porque só
       ali o servidor recusa. */
    const lista = [
      achado("1", { noutros_subgrupos: ["Civil"] }),
      achado("2", { em_outro_subgrupo: true }),
    ];

    expect(selecionaveis(lista)).toEqual(["1", "2"]);
  });
});

describe("o rótulo do botão", () => {
  it("⚠️ singular de verdade com um", () => {
    /* "Importar 1 processos" é o erro que aparece só quando alguém testa com
       um item -- justamente o caso que ninguém testa à mão. */
    expect(rotuloDeImportar(1)).toBe("Importar 1 processo");
  });

  it("plural com mais de um", () => {
    expect(rotuloDeImportar(201)).toBe("Importar 201 processos");
  });

  it("sem número quando nada está marcado", () => {
    expect(rotuloDeImportar(0)).toBe("Importar");
  });
});

describe("o resumo depois de gravar", () => {
  it("o caso limpo", () => {
    expect(resumoDaImportacao({ cadastrados: 201, ja_existiam: 0, falharam: [] })).toBe(
      "201 processos importados",
    );
  });

  it("🔴 já existentes NÃO são contados como falha", () => {
    /* Alguém cadastrou pela tela entre a prévia e a confirmação, e o servidor
       recusou de propósito. Somar isso a `falharam` faria a tela acusar
       defeito onde o sistema funcionou como devia. */
    const frase = resumoDaImportacao({ cadastrados: 8, ja_existiam: 2, falharam: [] });

    expect(frase).toBe("8 processos importados · 2 já estavam aqui");
    expect(frase).not.toContain("não entr");
  });

  it("falhas aparecem separadas", () => {
    expect(
      resumoDaImportacao({ cadastrados: 5, ja_existiam: 1, falharam: ["a", "b"] }),
    ).toBe("5 processos importados · 1 já estava aqui · 2 não entraram");
  });

  it("singular em cada parte", () => {
    expect(resumoDaImportacao({ cadastrados: 1, ja_existiam: 1, falharam: ["x"] })).toBe(
      "1 processo importado · 1 já estava aqui · 1 não entrou",
    );
  });
});


describe("qual etiqueta a linha mostra", () => {
  it("o novo TAMBÉM tem etiqueta", () => {
    /* ⚠️ Já foi vazio, e o vazio era pior: numa coluna chamada "Situação",
       célula em branco se lê como dado que faltou. Os quatro estados
       respondem. */
    expect(estadoDoAchado(achado("1"))).toBe("novo");
    expect(etiquetaDoAchado(achado("1"))).toBe("novo");
  });

  it("nenhum estado fica sem texto", () => {
    /* 🔴 O guarda do conjunto: a versão anterior devolvia "" no `default`, e
       um estado novo cairia lá calado -- sem etiqueta e sem teste falhando. */
    const todos = [
      achado("1", { ja_existe: true }),
      achado("2", { noutros_subgrupos: ["Civil"] }),
      achado("3", { em_outro_subgrupo: true }),
      achado("4", { removido_antes: true }),
      achado("5"),
    ];

    expect(todos.map(etiquetaDoAchado).filter((t) => !t)).toEqual([]);
  });

  it("o do destino ganha de todos", () => {
    /* 🔴 É o único que muda o que dá para fazer. Se outro estado o
       escondesse, a caixa pareceria marcável e o servidor recusaria. */
    const p = achado("1", {
      ja_existe: true,
      noutros_subgrupos: ["Civil"],
      em_outro_subgrupo: true,
    });

    expect(estadoDoAchado(p)).toBe("aqui");
    expect(etiquetaDoAchado(p)).toBe("já cadastrado aqui");
  });

  it("o NOME ganha do genérico", () => {
    /* Entre dizer onde e dizer que existe, dizer onde é melhor. */
    const p = achado("1", { noutros_subgrupos: ["Civil"], em_outro_subgrupo: true });

    expect(estadoDoAchado(p)).toBe("noutro");
    expect(etiquetaDoAchado(p)).toBe("já está em Civil");
  });

  it("vários nomes entram na mesma etiqueta", () => {
    const p = achado("1", { noutros_subgrupos: ["Civil", "Criminal"] });

    expect(etiquetaDoAchado(p)).toBe("já está em Civil, Criminal");
  });

  it("🔴 sem nome, diz que existe sem dizer onde", () => {
    /* O caso de quem não enxerga o subgrupo. A frase informa para a pessoa
       não cadastrar às cegas, e não revela um subgrupo que a listagem de
       Processos esconde dela. */
    const p = achado("1", { em_outro_subgrupo: true });

    expect(estadoDoAchado(p)).toBe("em_outro");
    expect(etiquetaDoAchado(p)).toBe("já acompanhado por outro subgrupo");
    expect(etiquetaDoAchado(p)).not.toContain("Criminal");
  });

  it('🔴 "removido antes" ganha de "novo"', () => {
    /* 🔴 O único estado que NÃO é excludente com "novo": o processo não está
       em subgrupo nenhum, que é exatamente a definição de novo. Sem esta
       precedência ele apareceria como novo e a pessoa o reimportaria sem
       saber que já o tinha recusado -- que é a razão de o campo existir. */
    const p = achado("1", { removido_antes: true });

    expect(estadoDoAchado(p)).toBe("removido");
    expect(etiquetaDoAchado(p)).toBe("removido antes");
  });

  it("mas perde para TODOS os outros", () => {
    /* ⚠️ O par negativo da posição: se o processo está em algum subgrupo
       hoje, isso importa mais do que ter sido apagado antes. Três casos,
       porque a precedência tem três degraus acima dele. */
    expect(estadoDoAchado(achado("1", { removido_antes: true, ja_existe: true }))).toBe("aqui");
    expect(
      estadoDoAchado(achado("2", { removido_antes: true, noutros_subgrupos: ["Civil"] })),
    ).toBe("noutro");
    expect(
      estadoDoAchado(achado("3", { removido_antes: true, em_outro_subgrupo: true })),
    ).toBe("em_outro");
  });

  it("⚠️ o texto é minúsculo -- a caixa alta é do componente", () => {
    /* Escrever "REMOVIDO ANTES" aqui seria a mesma regra em dois lugares:
       `EtiquetaDeSituacao` aplica `text-transform: uppercase`. */
    expect(etiquetaDoAchado(achado("1", { removido_antes: true }))).toBe("removido antes");
  });
});

describe("quantos já são acompanhados por outro subgrupo", () => {
  it("🔴 conta os DOIS casos, com nome e sem", () => {
    /* Contar só os com nome diria "1" numa lista com duas etiquetas cinza --
       e o número contradiria a tela logo abaixo dele. */
    const lista = [
      achado("1"),
      achado("2", { noutros_subgrupos: ["Civil"] }),
      achado("3", { em_outro_subgrupo: true }),
      achado("4", { ja_existe: true }),
    ];

    expect(quantosNoutroSubgrupo(lista)).toBe(2);
  });

  it("não conta duas vezes quem está nos dois", () => {
    const lista = [achado("1", { noutros_subgrupos: ["Civil"], em_outro_subgrupo: true })];

    expect(quantosNoutroSubgrupo(lista)).toBe(1);
  });

  it("zero quando ninguém está", () => {
    expect(quantosNoutroSubgrupo([achado("1"), achado("2")])).toBe(0);
  });
});

describe("a concordância dos rótulos", () => {
  it("⚠️ singular com um — o defeito que a tela real tinha", () => {
    /* Os rótulos do resumo eram fixos, então com um processo a fileira dizia
       "1 encontrados" enquanto o botão logo abaixo dizia "Importar 1
       processo". */
    expect(concordar(1, "encontrado", "encontrados")).toBe("encontrado");
  });

  it("plural com zero e com muitos", () => {
    expect(concordar(0, "encontrado", "encontrados")).toBe("encontrados");
    expect(concordar(45, "encontrado", "encontrados")).toBe("encontrados");
  });
});
