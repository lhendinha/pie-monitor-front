/** O modo de seleção múltipla de tarefas: quem está marcado, e as ações.
 *
 * 🔴 O escopo é parte do estado, não um detalhe. Ele responde "selecionar O
 * QUÊ" -- e é ele que impede dois cards da mesma tela de selecionarem ao
 * mesmo tempo, porque aí "Excluir 7" não diria quais sete.
 *
 * ⚠️ Guarda CHAVES (`subgrupo:tarefa`), nunca ids soltos -- ver `chaveDe`.
 *
 * ⚠️ Nenhum `interface` ou `type` mora aqui: a régua do front manda tipo para
 * `types/`, e o guarda é `tiposForaDoIndex.test.ts`.
 *
 * ➡️ `useSelecaoDeTarefas.test.tsx`; `PLANO_ACOES_EM_LOTE.md`, Fase 2.
 */
import { useCallback, useState } from "react";

import { chaveDe, chavesDoIntervalo } from "../utils/selecao";
import type { Tarefa } from "../types";

export function useSelecaoDeTarefas() {
  const [escopo, setEscopo] = useState("");
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set());
  /** A âncora do Shift+clique: a última chave que a pessoa tocou. */
  const [ancora, setAncora] = useState("");

  /** Entrar num escopo SAI do anterior e limpa -- ver o 🔴 do topo. */
  const entrar = useCallback((novo: string) => {
    setEscopo(novo);
    setMarcadas(new Set());
    setAncora("");
  }, []);

  const sair = useCallback(() => {
    setEscopo("");
    setMarcadas(new Set());
    setAncora("");
  }, []);

  /** Marca ou desmarca uma. Com `comShift`, marca o INTERVALO desde a âncora.
   *
   * ⚠️ O intervalo segue o estado do ALVO, não o da âncora: se a tarefa
   * clicada estava desmarcada, o intervalo inteiro liga; se estava marcada,
   * desliga. É o que faz Shift+clique parecer previsível. */
  const alternar = useCallback((tarefa: Tarefa, ordem: string[], comShift = false) => {
    const chave = chaveDe(tarefa);
    setMarcadas((atuais) => {
      const proximas = new Set(atuais);
      const ligando = !atuais.has(chave);
      const alvos = comShift && ancora ? chavesDoIntervalo(ordem, ancora, chave) : [chave];
      /* Âncora perdida (a página mudou) devolve vazio, e aí o clique vale
         por si -- nunca "não faz nada", que pareceria travado. */
      for (const c of alvos.length ? alvos : [chave]) {
        if (ligando) proximas.add(c);
        else proximas.delete(c);
      }
      return proximas;
    });
    setAncora(chave);
  }, [ancora]);

  /** Desmarca tudo SEM sair do modo.
   *
   * ⚠️ Diferente de `sair`, e a diferença é visível: "Limpar seleção" desfaz
   * as escolhas e deixa a barra de pé; "Cancelar" fecha o modo. Um botão
   * fazendo o do outro tiraria a pessoa de onde ela estava trabalhando. */
  const limpar = useCallback(() => {
    setMarcadas(new Set());
    setAncora("");
  }, []);

  /** Marca todas as `chaves`, ou desmarca se já estiverem todas marcadas. */
  const alternarTodas = useCallback((chaves: string[]) => {
    setMarcadas((atuais) => {
      const todas = chaves.length > 0 && chaves.every((c) => atuais.has(c));
      if (todas) {
        const proximas = new Set(atuais);
        for (const c of chaves) proximas.delete(c);
        return proximas;
      }
      return new Set([...atuais, ...chaves]);
    });
  }, []);

  /** Depois de agir: tira do conjunto o que já foi.
   *
   * 🔴 NÃO limpa tudo. Ação reversível não sai do modo -- distribuir é
   * multi-passo por natureza, um punhado para cada pessoa, e refazer a
   * seleção do zero a cada escolha é o que ninguém faz. */
  const esquecer = useCallback((chaves: string[]) => {
    setMarcadas((atuais) => {
      const proximas = new Set(atuais);
      for (const c of chaves) proximas.delete(c);
      return proximas;
    });
  }, []);

  return {
    escopo,
    marcadas,
    /** Está marcada? Recebe a TAREFA, para quem chama não montar a chave. */
    estaMarcada: (tarefa: Tarefa) => marcadas.has(chaveDe(tarefa)),
    entrar,
    sair,
    limpar,
    alternar,
    alternarTodas,
    esquecer,
  };
}
