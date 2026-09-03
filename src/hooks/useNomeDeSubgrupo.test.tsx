import { renderHook, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarQueryClientDeTeste } from "../test/queryTestUtils";
import { ToastProvider } from "../contexts/ToastContext";
import { system } from "../theme";

const mocks = vi.hoisted(() => ({ listarSubgrupos: vi.fn() }));
vi.mock("../services", () => mocks);

import { useNomeDeSubgrupo, useNomesDeSubgruposVisiveis } from "./useNomeDeSubgrupo";

/** Os mesmos provedores de `renderComProviders`, na mesma ordem -- o hook
 *  chama `useToastOnQueryError`, que exige o `ToastProvider`. */
function comProvedores(cliente: QueryClient = criarQueryClientDeTeste()) {
  return ({ children }: { children: ReactNode }) => (
    <ChakraProvider value={system}>
      <QueryClientProvider client={cliente}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

const PAGINA_UNICA = {
  subgrupos: [
    { subgrupo_id: "sg-civel", nome: "Cível", grupo_id: "g1" },
    { subgrupo_id: "sg-trab", nome: "Trabalhista", grupo_id: "g1" },
  ],
  total: 2,
  total_paginas: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue(PAGINA_UNICA);
});

describe("useNomeDeSubgrupo", () => {
  it("traduz o id no nome", async () => {
    const { result } = renderHook(() => useNomeDeSubgrupo(), { wrapper: comProvedores() });
    await waitFor(() => expect(result.current("sg-civel")).toBe("Cível"));
    expect(result.current("sg-trab")).toBe("Trabalhista");
  });

  it("🔴 id que não está no catálogo volta CRU -- e não vazio", async () => {
    /* É o que sobra quando o subgrupo foi apagado. A alternativa seria a
       etiqueta sumir da linha sem explicação, e aí a coluna mentiria: leria
       como "este item não tem subgrupo". Mesma decisão de
       `EtiquetasDeSubgrupo` e `LinhaDaInscricao`. */
    const { result } = renderHook(() => useNomeDeSubgrupo(), { wrapper: comProvedores() });
    await waitFor(() => expect(result.current("sg-civel")).toBe("Cível"));

    expect(result.current("sg-apagado")).toBe("sg-apagado");
  });

  it("🔴 ANTES de o catálogo chegar, devolve o id -- não quebra nem devolve vazio", () => {
    /* Sem estado de "carregando" de propósito: quem consome desenha uma
       etiqueta numa linha de tabela, e trocá-la por um esqueleto mexeria na
       ALTURA da linha -- a medida que o roteiro de produção afere (61px em
       Membros). O id aparece por um instante e vira nome; a linha não pula.

       ⚠️ Sem `await`: é justamente o primeiro render que este teste guarda. */
    mocks.listarSubgrupos.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useNomeDeSubgrupo(), { wrapper: comProvedores() });

    expect(result.current("sg-civel")).toBe("sg-civel");
  });

  it("⚠️ uma requisição SÓ, mesmo com dois consumidores no mesmo cliente", async () => {
    /* O ganho que sustenta usar isto em sete telas: a chave
       `qk.todosOsSubgrupos()` é compartilhada e o React Query deduplica. Se
       alguém trocar a chave por uma derivada de props, o custo vira uma
       requisição por tela -- e este teste cai. */
    const wrapper = comProvedores();

    const a = renderHook(() => useNomeDeSubgrupo(), { wrapper });
    const b = renderHook(() => useNomeDeSubgrupo(), { wrapper });
    await waitFor(() => expect(a.result.current("sg-civel")).toBe("Cível"));
    await waitFor(() => expect(b.result.current("sg-civel")).toBe("Cível"));

    expect(mocks.listarSubgrupos).toHaveBeenCalledTimes(1);
  });
});

describe("useNomesDeSubgruposVisiveis", () => {
  it("🔴 DESCARTA o id que não está no catálogo -- ao contrário do irmão", async () => {
    /* O par que prova a diferença deliberada entre os dois hooks. Aqui "não
       resolveu" significa "não é seu": o catálogo já vem recortado pelo
       servidor (`GET /subgrupos` é escopado), e um envio entra na lista da
       pessoa por INTERSEÇÃO -- basta um dos notificados cruzar com os dela.
       Mostrar os outros seria despejar identificador alheio na tela.

       ⚠️ Se um dia alguém "consertar" isto para cair no id, o Histórico passa
       a exibir código cru ao lado dos nomes. É o que este teste impede. */
    const { result } = renderHook(() => useNomesDeSubgruposVisiveis(), { wrapper: comProvedores() });
    await waitFor(() => expect(result.current(["sg-civel"])).toEqual(["Cível"]));

    expect(result.current(["sg-civel", "sg-alheio", "sg-trab"])).toEqual(["Cível", "Trabalhista"]);
  });

  it("⚠️ o irmão faz o OPOSTO com a mesma entrada -- e isso é decisão, não descuido", async () => {
    /* Guarda a assimetria: um item de UM subgrupo mostra o id quando ele foi
       apagado (a etiqueta sumir faria a coluna afirmar "sem subgrupo"); uma
       LISTA descarta o que não é seu. */
    const { result } = renderHook(
      () => ({ um: useNomeDeSubgrupo(), varios: useNomesDeSubgruposVisiveis() }),
      { wrapper: comProvedores() },
    );
    await waitFor(() => expect(result.current.um("sg-civel")).toBe("Cível"));

    expect(result.current.um("sg-alheio")).toBe("sg-alheio");
    expect(result.current.varios(["sg-alheio"])).toEqual([]);
  });

  it("lista ausente ou vazia devolve vazio, sem quebrar", async () => {
    const { result } = renderHook(() => useNomesDeSubgruposVisiveis(), { wrapper: comProvedores() });
    await waitFor(() => expect(result.current(["sg-civel"])).toEqual(["Cível"]));

    expect(result.current(undefined)).toEqual([]);
    expect(result.current([])).toEqual([]);
  });
});
