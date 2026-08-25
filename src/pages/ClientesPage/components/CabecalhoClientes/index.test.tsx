import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";
import CabecalhoClientes from "./index";

/** 🔴 A busca de clientes ganhou teto no servidor (`MAXIMO_DE_RESULTADOS_DE_BUSCA`,
 * 50) mas `total` continua sendo a contagem REAL -- e tem que continuar, senão
 * a tela diria "50 clientes" pra quem tem 4.000.
 *
 * O efeito colateral era pior que o problema original: a linha anunciava "120
 * clientes" com 50 linhas embaixo, sem dizer por quê. Lista truncada em
 * silêncio se lê como lista inteira, e quem procura o que ficou de fora
 * conclui que não existe. É a mesma regra dos painéis de filtro.
 */
function montar(props: Partial<Parameters<typeof CabecalhoClientes>[0]> = {}) {
  return renderComProviders(
    <CabecalhoClientes
      carregando={false}
      total={120}
      exibidos={50}
      busca="silveira"
      onBuscar={vi.fn()}
      podeCriar={false}
      onNovoCliente={vi.fn()}
      {...props}
    />,
  );
}

describe("contagem da tela de Clientes", () => {
  it("avisa quando a busca mostra menos que o total", () => {
    montar();
    expect(screen.getByText(/Mostrando 50 de 120 clientes — refine a busca/)).toBeInTheDocument();
  });

  it("SEM busca não manda refinar -- ali existe barra de páginas", () => {
    /* ⚠️ Pego na verificação em Chrome: a primeira versão dizia "Mostrando 10
       de 120 clientes — refine a busca" na tela normal, onde a saída certa é
       clicar na página 2. */
    montar({ busca: "", exibidos: 10 });
    expect(screen.queryByText(/refine a busca/)).not.toBeInTheDocument();
    expect(screen.getByText("120 clientes")).toBeInTheDocument();
  });

  it("não fala do resultado velho enquanto o novo não chegou", () => {
    /* Durante a espera entre teclas, o que está na tabela é o resultado
       ANTERIOR -- a frase falaria dele como se fosse do termo recém-digitado. */
    montar({ buscando: true });
    expect(screen.queryByText(/refine a busca/)).not.toBeInTheDocument();
  });

  it("busca que cabe inteira não avisa nada", () => {
    montar({ total: 12, exibidos: 12 });
    expect(screen.queryByText(/refine a busca/)).not.toBeInTheDocument();
    expect(screen.getByText("12 clientes")).toBeInTheDocument();
  });
});
