import { Table } from "@chakra-ui/react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import Tabela from ".";

function montar(colunas: readonly (string | { rotulo: string; aDireita?: boolean })[]) {
  return renderComProviders(
    <Tabela colunas={colunas}>
      <Table.Row>
        <Table.Cell>uma linha</Table.Cell>
      </Table.Row>
    </Tabela>,
  );
}

describe("cabeçalho", () => {
  it("a coluna simples continua sendo uma string", () => {
    montar(["Descrição", "Conta"]);
    expect(screen.getByRole("columnheader", { name: "Descrição" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Conta" })).toBeInTheDocument();
  });

  it("🔴 a coluna com alinhamento próprio mostra o RÓTULO, não o objeto", () => {
    /* O par negativo do defeito óbvio: uma coluna que virou objeto e caiu no
       JSX crua apareceria como "[object Object]" no cabeçalho. */
    montar(["Descrição", { rotulo: "Valor", aDireita: true }]);
    expect(screen.getByRole("columnheader", { name: "Valor" })).toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("as duas formas convivem na mesma tabela", () => {
    montar(["Descrição", { rotulo: "Valor", aDireita: true }, ""]);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  /* ⚠️ O ALINHAMENTO em si não se afere aqui: `textAlign` vira classe do
     Chakra, e o jsdom não resolve o CSS dele -- um `toHaveStyle` passaria
     verde com a regra ausente. Quem confere é o roteiro de Chrome
     (`verificar-financeiro.mjs`), comparando `th` e `td` da coluna de
     dinheiro. */
});
