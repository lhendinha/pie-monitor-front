/** O estado do modo de seleção.
 *
 * 🔴 O que este arquivo trava: entrar num escopo SAI do outro. Sem isso, dois
 * cards da mesma tela selecionam ao mesmo tempo e "Excluir 7" não diz quais
 * sete.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSelecaoDeTarefas } from "./useSelecaoDeTarefas";
import type { Tarefa } from "../types";

function tarefa(subgrupo: string, id: string): Tarefa {
  return {
    subgrupo_id: subgrupo, tarefa_id: id, titulo: `Tarefa ${id}`,
    data: "2026-09-10", coluna_id: "c1", prioridade: "Média",
  } as Tarefa;
}

const LISTA = [tarefa("s1", "a"), tarefa("s1", "b"), tarefa("s1", "c"),
                tarefa("s1", "d"), tarefa("s1", "e")];
const ORDEM = LISTA.map((t) => `${t.subgrupo_id}:${t.tarefa_id}`);

describe("useSelecaoDeTarefas", () => {
  it("nasce fora do modo, sem nada marcado", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    expect(result.current.escopo).toBe("");
    expect(result.current.marcadas.size).toBe(0);
  });

  it("entrar liga o escopo; sair desliga e limpa", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.entrar("disponiveis"));
    expect(result.current.escopo).toBe("disponiveis");
    act(() => result.current.alternar(LISTA[0], ORDEM));
    expect(result.current.marcadas.size).toBe(1);
    act(() => result.current.sair());
    expect(result.current.escopo).toBe("");
    expect(result.current.marcadas.size).toBe(0);
  });

  it("🔴 trocar de escopo LIMPA a seleção", () => {
    /* Sem isto, "3 selecionadas" no card de baixo contaria o que foi
       marcado no de cima -- e o botão apagaria o que ninguém viu. */
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.entrar("minhas"));
    act(() => result.current.alternar(LISTA[0], ORDEM));
    act(() => result.current.entrar("disponiveis"));
    expect(result.current.marcadas.size).toBe(0);
  });

  it("alternar marca e desmarca a mesma", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternar(LISTA[0], ORDEM));
    expect(result.current.estaMarcada(LISTA[0])).toBe(true);
    act(() => result.current.alternar(LISTA[0], ORDEM));
    expect(result.current.estaMarcada(LISTA[0])).toBe(false);
  });

  it("Shift+clique marca o intervalo desde a âncora", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternar(LISTA[1], ORDEM));          // âncora em "b"
    act(() => result.current.alternar(LISTA[3], ORDEM, true));    // até "d"
    expect([...result.current.marcadas].sort()).toEqual(["s1:b", "s1:c", "s1:d"]);
  });

  it("Shift+clique DESMARCA o intervalo quando o alvo já estava marcado", () => {
    /* O intervalo segue o estado do ALVO, não o da âncora -- é o que faz o
       gesto parecer previsível em vez de sortear. */
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternarTodas(ORDEM));
    act(() => result.current.alternar(LISTA[1], ORDEM));          // desmarca "b", vira âncora
    act(() => result.current.alternar(LISTA[3], ORDEM, true));    // "d" estava marcada -> desliga b..d
    expect([...result.current.marcadas].sort()).toEqual(["s1:a", "s1:e"]);
  });

  it("⚠️ Shift SEM âncora vale por um clique só, nunca por nada", () => {
    /* Um Shift+clique que não faz nada parece a tela travada. */
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternar(LISTA[2], ORDEM, true));
    expect([...result.current.marcadas]).toEqual(["s1:c"]);
  });

  it("⚠️ âncora que sumiu da ordem vale por um clique só", () => {
    /* Acontece quando a página muda entre um clique e o outro. */
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternar(LISTA[1], ORDEM));
    const outraPagina = ["s1:x", "s1:y", "s1:z"];
    act(() => result.current.alternar(tarefa("s1", "y"), outraPagina, true));
    expect([...result.current.marcadas].sort()).toEqual(["s1:b", "s1:y"]);
  });

  it("alternarTodas marca tudo, e de novo desmarca tudo", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternarTodas(ORDEM));
    expect(result.current.marcadas.size).toBe(5);
    act(() => result.current.alternarTodas(ORDEM));
    expect(result.current.marcadas.size).toBe(0);
  });

  it("alternarTodas com seleção PARCIAL completa, não inverte", () => {
    /* Meia lista marcada e a pessoa clica a caixa do topo: ela espera
       marcar tudo. Inverter desmarcaria o que ela acabou de escolher. */
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternar(LISTA[0], ORDEM));
    act(() => result.current.alternarTodas(ORDEM));
    expect(result.current.marcadas.size).toBe(5);
  });

  it("alternarTodas com lista vazia não marca nada", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternarTodas([]));
    expect(result.current.marcadas.size).toBe(0);
  });

  it("🔴 esquecer tira só o que agiu, e NÃO sai do modo", () => {
    /* Ação reversível é multi-passo por natureza: um punhado para cada
       pessoa. Limpar tudo obrigaria a refazer a seleção do zero. */
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.entrar("agenda"));
    act(() => result.current.alternarTodas(ORDEM));
    act(() => result.current.esquecer(["s1:a", "s1:b"]));
    expect([...result.current.marcadas].sort()).toEqual(["s1:c", "s1:d", "s1:e"]);
    expect(result.current.escopo).toBe("agenda");
  });

  it("esquecer chave que não estava marcada é inócuo", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    act(() => result.current.alternar(LISTA[0], ORDEM));
    act(() => result.current.esquecer(["s1:zzz"]));
    expect([...result.current.marcadas]).toEqual(["s1:a"]);
  });

  it("🔴 o MESMO tarefa_id em subgrupos diferentes não colide", () => {
    const { result } = renderHook(() => useSelecaoDeTarefas());
    const daCivel = tarefa("civel", "abc");
    const daTrabalhista = tarefa("trabalhista", "abc");
    act(() => result.current.alternar(daCivel, ["civel:abc", "trabalhista:abc"]));
    expect(result.current.estaMarcada(daCivel)).toBe(true);
    expect(result.current.estaMarcada(daTrabalhista)).toBe(false);
  });
});
