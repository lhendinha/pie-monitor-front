import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";
import { TAMANHO_PAGINA_PADRAO } from "../../../../constants";
import type { ProcessoEncontrado } from "../../../../types";

const mocks = vi.hoisted(() => ({
  /* A prévia tem um `CampoDeResponsaveis` dentro, que lista os membros do
     subgrupo. Sem o mock ele bate na API de verdade. */
  listarMembrosDoSubgrupo: vi.fn(async () => ({ membros: [], total: 0 })),
}));

vi.mock("../../../../services", () => mocks);

import PreviaDaImportacao from "./index";

/** A tabela de conferência da importação por OAB.
 *
 * 🔴 O que este arquivo protege é o ALINHAMENTO por contagem: cinco títulos
 * no cabeçalho e cinco células em cada linha. Uma coluna a mais numa linha
 * empurra tudo à direita, e o número de comunicações aparece debaixo de
 * "Situação".
 *
 * ⚠️ **O padding e a divisória NÃO se testam aqui** -- são CSS, e o jsdom não
 * calcula estilo: `getComputedStyle` devolveria vazio e o teste passaria com
 * a tabela torta. Quem cobre isso é o guarda de forma em
 * `components/CelulaComSub/celulaDeTabela.test.ts`, e quem VÊ é o Chrome.
 */

const COLUNAS = ["", "Processo", "Tribunal", "Comunicações", "Situação"];

function achado(numero: string, extra: Partial<ProcessoEncontrado> = {}): ProcessoEncontrado {
  return {
    numero_processo: numero,
    apelido: "Procedimento Comum Cível",
    tribunal: "TJRS",
    comunicacoes: 3,
    ja_existe: false,
    noutros_subgrupos: [],
    em_outro_subgrupo: false,
    removido_antes: false,
    ...extra,
  };
}

/** Um de cada estado, na ordem da precedência que o plano fixou. */
const OS_QUATRO = [
  achado("1", { ja_existe: true }),
  achado("2", { noutros_subgrupos: ["Trabalhista"] }),
  achado("3", { em_outro_subgrupo: true }),
  achado("4", { removido_antes: true }),
  achado("5"),
];

function montar(processos: ProcessoEncontrado[] = OS_QUATRO) {
  return renderComProviders(
    <PreviaDaImportacao
      previa={{
        id: "b-1",
        total_encontrado: processos.length,
        atingiu_o_teto: false,
        processos,
      }}
      subgrupoId="sg-1"
      meuEmail="eu@x.com"
      souMembro
      importando={false}
      progresso={null}
      onImportar={vi.fn()}
      onVoltar={vi.fn()}
    />,
  );
}

function linhas() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

/** Vinte e três achados, como a busca real da OAB do relato. */
function muitos(quantos = 23): ProcessoEncontrado[] {
  return Array.from({ length: quantos }, (_, i) => achado(String(i + 1)));
}

describe("a fileira de cartões", () => {
  it("o quarto cartão APARECE com zero", () => {
    /* 🔴 "0 também em outro subgrupo" é a resposta "nenhum". Escondê-lo faria
       a fileira mudar de tamanho conforme o resultado -- e quem viu quatro
       cartões numa busca procuraria o que sumiu na seguinte. */
    montar([achado("1")]);

    /* ⚠️ No PLURAL: zero não é um, e "0 também em outro subgrupo" seria o
       mesmo erro de concordância pelo outro lado. */
    expect(screen.getByText("também em outros subgrupos")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("⚠️ concorda no singular -- a tela dizia `1 encontrados`", () => {
    /* Os rótulos eram fixos, então com um processo a fileira errava a
       concordância enquanto o botão logo abaixo acertava ("Importar 1
       processo"). Errar em metade da tela parece descuido justamente onde
       ela pede confiança. */
    montar([achado("1")]);

    expect(screen.getByText("encontrado")).toBeInTheDocument();
    expect(screen.getByText("seria cadastrado neste subgrupo")).toBeInTheDocument();
    expect(screen.getByText("já estão neste subgrupo")).toBeInTheDocument();
    expect(screen.queryByText("encontrados")).not.toBeInTheDocument();
  });

  it("e no plural com muitos", () => {
    montar(muitos(23));

    expect(screen.getByText("encontrados")).toBeInTheDocument();
    expect(screen.getByText("seriam cadastrados neste subgrupo")).toBeInTheDocument();
  });
});

describe("a tabela da prévia", () => {
  it("tem as colunas de Processos, na ordem", () => {
    montar();
    const titulos = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim() ?? "");

    expect(titulos).toEqual(COLUNAS);
  });

  it("cada linha tem UMA célula por coluna -- é isso que alinha", () => {
    /* 🔴 O par do cabeçalho: os dois testes juntos dizem que o valor cai
       embaixo do título certo. Só a contagem do cabeçalho passaria também
       numa linha com quatro células. */
    montar();
    for (const linha of linhas()) {
      expect(within(linha).getAllByRole("cell")).toHaveLength(COLUNAS.length);
    }
  });

  it("mostra tribunal e comunicações de cada processo", () => {
    montar([achado("1", { tribunal: "STJ", comunicacoes: 5 })]);
    const celulas = within(linhas()[0]).getAllByRole("cell");

    expect(celulas[2]).toHaveTextContent("STJ");
    expect(celulas[3]).toHaveTextContent("5");
  });

  it("sem tribunal a coluna leva traço, e não fica vazia", () => {
    /* ⚠️ Célula vazia se lê como falha de carregamento; o traço diz "o PJe
       não mandou". */
    montar([achado("1", { tribunal: "" })]);
    expect(within(linhas()[0]).getAllByRole("cell")[2]).toHaveTextContent("—");
  });

  it("põe a situação de cada estado na última coluna", () => {
    montar();
    const situacoes = linhas().map(
      (l) => within(l).getAllByRole("cell")[4].textContent?.trim() ?? "",
    );

    expect(situacoes).toEqual([
      "já cadastrado aqui",
      "já está em Trabalhista",
      "já acompanhado por outro subgrupo",
      "removido antes",
      "novo",
    ]);
  });

  it("nenhuma linha fica com a Situação em branco", () => {
    /* 🔴 O par do teste acima, e o que o usuário viu na tela: célula vazia
       numa coluna chamada "Situação" se lê como falha de carregamento. */
    montar();
    const vazias = linhas().filter(
      (l) => !within(l).getAllByRole("cell")[4].textContent?.trim(),
    );

    expect(vazias).toHaveLength(0);
  });

  it("mostra uma PÁGINA, não a busca inteira", () => {
    /* 🔴 O que o usuário viu: 23 linhas de uma vez, empurrando o botão de
       confirmar para fora da tela. Com 500 -- o teto da busca -- a tela
       ficaria inutilizável. */
    montar(muitos());
    expect(linhas()).toHaveLength(TAMANHO_PAGINA_PADRAO);
  });

  it("`Marcar todos` alcança as OUTRAS páginas", async () => {
    /* 🔴 A armadilha clássica da lista paginada, e a que o desenho registra:
       o botão diz "todos" e marca só o que está renderizado. Aqui a marca é
       por NÚMERO, não por posição -- e a contagem prova. */
    montar(muitos());
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole("button", { name: "Desmarcar todos" }));
    expect(screen.getByText(/de 23 marcados/).textContent).toContain("0");

    await usuario.click(screen.getByRole("button", { name: "Marcar todos" }));
    expect(screen.getByText(/de 23 marcados/).textContent).toContain("23");
  });

  it("o clique NA CAIXA desmarca -- uma vez só", async () => {
    /* 🔴 O defeito que a tela teve: `Checkbox.Root` é um `<label>`, então o
       clique nela disparava o `onCheckedChange` E subia para o `onClick` da
       linha. Duas alternâncias no mesmo clique se anulam, e a caixa -- o
       alvo mais óbvio da tela -- não fazia nada. */
    montar(muitos(3));
    const usuario = userEvent.setup();

    await usuario.click(within(linhas()[0]).getByRole("checkbox"));

    expect(screen.getByText(/de 3 marcados/).textContent).toContain("2");
  });

  it("o clique no RESTO da linha também alterna", async () => {
    /* O par do teste acima: consertar o clique da caixa não pode desligar o
       da linha, que é o alvo grande. */
    montar(muitos(3));
    const usuario = userEvent.setup();

    await usuario.click(within(linhas()[0]).getAllByRole("cell")[1]);

    expect(screen.getByText(/de 3 marcados/).textContent).toContain("2");
  });

  it("a marca SOBREVIVE à virada de página", async () => {
    /* ⚠️ O par do teste acima: desmarcar na página 1, ir à 2 e voltar tem
       que devolver a caixa vazia. Se o estado morasse na linha, a volta
       remontaria marcada e a pessoa importaria o que tirou. */
    montar(muitos());
    const usuario = userEvent.setup();

    const primeira = within(linhas()[0]).getByRole("checkbox");
    await usuario.click(primeira);
    expect(screen.getByText(/de 23 marcados/).textContent).toContain("22");

    /* ⚠️ Por `title`, não por nome acessível: as setas de `Pagination` têm o
       glifo "›" como conteúdo, e é ELE que vira o nome -- o `title` fica de
       legenda. Anotado como frente própria; não é desta entrega. */
    await usuario.click(screen.getByTitle("Próxima página"));
    await usuario.click(screen.getByTitle("Página anterior"));

    expect((within(linhas()[0]).getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/de 23 marcados/).textContent).toContain("22");
  });

  it("soma as comunicações de TODOS, não as da página", () => {
    montar(muitos(23));
    // 23 achados de 3 comunicações cada.
    expect(screen.getByText(/69 comunicações/)).toBeInTheDocument();
  });

  it("o rótulo do responsável acompanha a seleção", async () => {
    montar(muitos(3));
    const usuario = userEvent.setup();
    expect(screen.getByText("Responsável pelos 3 processos")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Desmarcar todos" }));
    /* ⚠️ Sem número: "Responsável por 0 processos" descreve um estado que
       ninguém pediu. */
    expect(screen.getByText("Responsável")).toBeInTheDocument();
  });

  it("só o do PRÓPRIO subgrupo é impedido de marcar", () => {
    /* 🔴 O par que impede alguém "consertar" travando os outros: o processo
       acompanhado por outra equipe é importável de propósito.

       🔴 E vale igual para "removido antes", que entrou depois: a marca
       INFORMA, não impede -- quem ela trava é a importação AUTOMÁTICA, que
       age sozinha, e não esta tela, onde há uma pessoa decidindo. Bloquear
       aqui seria parede sem saída, já que não existe tela para apagar a
       marca. */
    montar();
    const travadas = linhas().map(
      (l) => (within(l).getByRole("checkbox") as HTMLInputElement).disabled,
    );

    expect(travadas).toEqual([
      true,   // já cadastrado aqui -- o único que o servidor recusa
      false,  // já está em Trabalhista
      false,  // já acompanhado por outro subgrupo
      false,  // 🔴 removido antes
      false,  // novo
    ]);
  });
});
