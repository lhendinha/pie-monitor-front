import { MemoryRouter, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { useEstadoNaUrl } from "./useEstadoNaUrl";
import { useParametrosDaUrl } from "./useParametrosDaUrl";

/** O estado de listagem que mora na query string.
 *
 * 🔴 O requerimento: sair da lista para um detalhe e VOLTAR tem que devolver
 * a página e o tamanho que a pessoa escolheu. A URL responde isso de graça --
 * e estes testes fixam as regras que fazem valer, cada uma nascida de um
 * defeito real da migração.
 */
function Sonda() {
  const [pagina, setPagina] = useEstadoNaUrl("pagina", 1);
  const [tamanho, setTamanho] = useEstadoNaUrl("tamanho", 10, { tambemApaga: ["pagina"] });
  const [busca, setBusca] = useEstadoNaUrl("busca", "", { tambemApaga: ["pagina"] });
  const [ligado, setLigado] = useEstadoNaUrl("falha", true);
  const { atualizar } = useParametrosDaUrl();

  return (
    <>
      <div data-testid="url">{useLocation().search || "(sem query)"}</div>
      <div data-testid="valores">{`${pagina}|${tamanho}|${busca || "-"}|${ligado}`}</div>
      <button onClick={() => setPagina(2)}>pagina 2</button>
      <button onClick={() => setPagina(1)}>pagina 1</button>
      <button onClick={() => setBusca("")}>limpar busca</button>
      <button onClick={() => setTamanho(30)}>tamanho 30</button>
      <button onClick={() => setBusca("posse")}>buscar</button>
      <button onClick={() => setLigado(false)}>desligar</button>
      <button onClick={() => atualizar({ cliente: "c1", cliente_nome: "Sonia" })}>
        cliente com nome
      </button>
    </>
  );
}

function montar(rota = "/lista") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Sonda />
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent;
const valores = () => screen.getByTestId("valores").textContent;

describe("o que a URL guarda", () => {
  it("nasce sem query nenhuma -- o padrão não vai para o endereço", () => {
    montar();
    expect(url()).toBe("(sem query)");
    expect(valores()).toBe("1|10|-|true");
  });

  it("🔴 lê o estado de uma URL colada -- é o que faz voltar funcionar", () => {
    /* O caso do requerimento: a entrada do histórico carrega a query, e
       voltar para ela remonta a tela já na página certa. */
    montar("/lista?pagina=2&tamanho=30&busca=posse");
    expect(valores()).toBe("2|30|posse|true");
  });

  it("escreve o que difere do padrão", async () => {
    montar();
    await userEvent.click(screen.getByText("pagina 2"));
    expect(url()).toBe("?pagina=2");
  });
});

describe("voltar ao padrão", () => {
  it("🔴 APAGA o parâmetro em vez de escrever o padrão", async () => {
    /* Quem decide isso é este hook, o único que conhece o padrão da própria
       chave -- o escritor múltiplo apenas escreve o que recebe. Sem isso a
       URL acumularia `?pagina=1&tamanho=10` sem ninguém ter escolhido nada. */
    montar("/lista?pagina=2");
    await userEvent.click(screen.getByText("pagina 1"));

    expect(url()).toBe("(sem query)");
  });

  it("limpar a busca tira a chave, e leva a página junto", async () => {
    montar("/lista?busca=posse&pagina=3");
    await userEvent.click(screen.getByText("limpar busca"));

    expect(url()).toBe("(sem query)");
  });
});

describe("mudar filtro volta para a página 1", () => {
  it("🔴 numa escrita SÓ -- senão uma apaga a outra", async () => {
    /* `setSearchParams` navega na hora: `setBusca(v)` seguido de
       `setPagina(1)` partiria da mesma URL, e a segunda escrita apagaria a
       busca. O reset é propriedade do filtro (`tambemApaga`). */
    montar("/lista?pagina=3");
    await userEvent.click(screen.getByText("buscar"));

    expect(url()).toBe("?busca=posse");
    expect(valores()).toBe("1|10|posse|true");
  });

  it("trocar o tamanho também volta para a primeira", async () => {
    montar("/lista?pagina=4");
    await userEvent.click(screen.getByText("tamanho 30"));
    expect(url()).toBe("?tamanho=30");
  });
});

describe("dois parâmetros no mesmo gesto", () => {
  it("🔴 vão juntos -- foi a pílula de cliente que provou", async () => {
    /* Escolher um cliente grava o id E o nome do rótulo. Em duas chamadas, a
       segunda apagava a primeira e a pílula ficava acesa sem filtrar nada. */
    montar();
    await userEvent.click(screen.getByText("cliente com nome"));

    expect(url()).toContain("cliente=c1");
    expect(url()).toContain("cliente_nome=Sonia");
  });
});

describe("booleano", () => {
  it("🔴 escreve os DOIS estados, e não só o verdadeiro", async () => {
    /* Um filtro que ABRE ligado (o link "só com falha" da Área de trabalho)
       não conseguia ser desligado: `false` era omitido, e o que some da URL
       volta como o padrão -- que ali era `true`. */
    montar();
    await userEvent.click(screen.getByText("desligar"));

    expect(url()).toBe("?falha=0");
    expect(valores()).toBe("1|10|-|false");
  });
});

describe("parâmetro torto não derruba a tela", () => {
  it("⚠️ `?pagina=abc` cai no padrão", () => {
    /* A URL é editável à mão e chega colada de qualquer lugar. */
    montar("/lista?pagina=abc");
    expect(valores()).toBe("1|10|-|true");
  });
});
