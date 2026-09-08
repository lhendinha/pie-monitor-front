import { Table } from "@chakra-ui/react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import Tabela from ".";

function montar(
  colunas: readonly (string | { rotulo: string; aDireita?: boolean })[],
  linhas = 1,
) {
  return renderComProviders(
    <Tabela colunas={colunas}>
      {Array.from({ length: linhas }, (_, i) => (
        <Table.Row key={i}>
          <Table.Cell>linha {i + 1}</Table.Cell>
        </Table.Row>
      ))}
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

  /* ⚠️ Duas coisas NÃO se aferem aqui, e as duas pela mesma razão -- o jsdom
     não resolve o CSS do Chakra, e um `toHaveStyle` passaria verde com a
     regra ausente:

     - o ALINHAMENTO da coluna de dinheiro (`textAlign`);
     - a divisória que a ÚLTIMA linha NÃO desenha (`tbody tr:last-child`),
       sem a qual ela risca o cartão e sobra um vão que se lê como linha
       vazia -- o usuário viu isso na tabela de faturas.

     Quem confere as duas é o roteiro de Chrome (`verificar-financeiro.mjs`),
     medindo `getComputedStyle` da primeira e da última linha. */
});
