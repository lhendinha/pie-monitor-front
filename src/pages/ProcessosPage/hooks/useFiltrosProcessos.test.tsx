import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../services", () => ({ getEmail: () => "eu@local.test" }));

import { useFiltrosProcessos } from "./useFiltrosProcessos";

/** O hook E a URL que ele escreve, lidos no mesmo render. */
function useComUrl(buscaInicial?: string) {
  return { f: useFiltrosProcessos(undefined, buscaInicial), search: useLocation().search };
}

function montar(url: string, buscaInicial?: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(() => useComUrl(buscaInicial), { wrapper });
}

describe("useFiltrosProcessos.limpar", () => {
  it("🔴 limpa os filtros E a busca numa escrita só -- a data não pode sobreviver", async () => {
    /* Medido em produção em 04/09/2026: com data e busca na URL, "Limpar
       filtros" tirava só a busca e a data ficava -- "Mostrando 0 de 29" com o
       botão sem efeito. Eram DUAS escritas na mesma ação, e a segunda partia
       da URL de antes da primeira. */
    const { result } = montar("/processos?verificar_ate=2026-09-04&busca=naoexiste&pagina=2");
    expect(result.current.f.filtros.dataVerificarAte).toBe("2026-09-04");

    act(() => result.current.f.limpar());

    expect(result.current.search).toBe("");
    expect(result.current.f.filtros.dataVerificarAte).toBe("");
    expect(result.current.f.buscaInput).toBe("");
    // A busca que vai à consulta tem debounce: "nenhum filtro ativo" chega depois dele.
    await waitFor(() => expect(result.current.f.filtroAtivo).toBe(false));
  });

  it("limpa todos os tipos de filtro de uma vez: lista, texto e responsável", () => {
    const { result } = montar(
      "/processos?situacao=a&situacao=b&fase=f1&cliente=c1&cliente_nome=Fulano&subgrupo=s1&prazo_ate=2026-09-30&responsavel=eu",
    );
    expect(result.current.f.filtroAtivo).toBe(true);

    act(() => result.current.f.limpar());

    expect(result.current.search).toBe("");
    expect(result.current.f.aplicados).toEqual({
      clienteId: "", clienteNome: "", subgrupoId: "", faseIds: [], situacaoIds: [],
      dataVerificarAte: "", prazoFinalAte: "", responsavelId: "",
    });
  });

  it("com busca inicial (link do e-mail), limpar ESCREVE a busca vazia em vez de apagá-la", () => {
    /* Apagar a chave devolveria o padrão -- que aqui é o número que veio do
       link. "Limpar" traria a busca de volta. */
    const { result } = montar("/processos?verificar_ate=2026-09-04", "90000000000000000000");
    expect(result.current.f.buscaInput).toBe("90000000000000000000");

    act(() => result.current.f.limpar());

    expect(result.current.f.buscaInput).toBe("");
    expect(result.current.f.filtros.dataVerificarAte).toBe("");
    expect(result.current.search).not.toContain("verificar_ate");
  });
});
