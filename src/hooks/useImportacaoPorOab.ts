import { useCallback, useEffect, useRef, useState } from "react";

import { buscarProcessosPorOab, importarProcessos } from "../services/api";
import { assinarCanal } from "../utils/canalDeTempoReal";
import type {
  PreviaDaImportacao,
  ProgressoDaImportacao,
  ResultadoDaImportacao,
  EtapaDaImportacao,
} from "../types";

export function useImportacaoPorOab(subgrupoId: string) {
  const [etapa, setEtapa] = useState<EtapaDaImportacao>("formulario");
  const [previa, setPrevia] = useState<PreviaDaImportacao | null>(null);
  const [resultado, setResultado] = useState<ResultadoDaImportacao | null>(null);
  const [erro, setErro] = useState("");
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);

  /** 🔴 A barra ouve o canal SEMPRE, não só durante a gravação.
   *
   * Assinar ao clicar em "Importar" abriria uma janela: a primeira mensagem
   * (`feitos: 0`) sai antes de o `await` sequer devolver o controle, e um
   * assinante registrado depois a perderia -- a barra começaria do segundo
   * pulso, ou de lugar nenhum numa importação curta.
   */
  useEffect(
    () =>
      assinarCanal("importacao_progresso", (mensagem) => {
        const { feitos, total } = mensagem as unknown as ProgressoDaImportacao;
        setProgresso({ feitos, total });
      }),
    [],
  );

  /** ⚠️ Evita que uma resposta de busca antiga sobrescreva a nova.
   *
   * Buscar, corrigir a OAB e buscar de novo pode fazer a primeira chegar
   * depois -- e a tela mostraria a lista da inscrição errada, sem nada
   * indicando isso. */
  const buscaAtual = useRef(0);

  const buscar = useCallback(
    async (numeroOab: string, ufOab: string, periodo: { de?: string; ate?: string } = {}) => {
      const minha = ++buscaAtual.current;
      setEtapa("buscando");
      setErro("");
      setProgresso(null);
      try {
        const resposta = await buscarProcessosPorOab(subgrupoId, numeroOab, ufOab, periodo);
        if (minha !== buscaAtual.current) return;
        setPrevia(resposta);
        setEtapa(resposta.processos.length === 0 ? "vazio" : "previa");
      } catch (e) {
        if (minha !== buscaAtual.current) return;
        setErro(e instanceof Error ? e.message : "Não foi possível buscar agora.");
        setEtapa("erro");
      }
    },
    [subgrupoId],
  );

  const importar = useCallback(
    async (numeros: string[], responsaveis: string[]) => {
      if (!previa) return;
      setEtapa("importando");
      setErro("");
      /* Nasce em zero para a barra existir antes do primeiro pulso do canal
         -- se ele não chegar, ela fica indeterminada em vez de ausente. */
      setProgresso({ feitos: 0, total: numeros.length });
      try {
        setResultado(await importarProcessos(subgrupoId, previa.id, numeros, responsaveis));
        setEtapa("concluido");
      } catch (e) {
        /* 🔴 A mensagem NÃO pode afirmar que nada foi gravado.
         *
         * Um timeout no meio deixa os processos já criados no banco -- dizer
         * "a importação falhou" mandaria a pessoa procurar o que já está lá.
         * Repetir é seguro: o servidor pula o que já existe. */
        setErro(
          e instanceof Error
            ? e.message
            : "A importação foi interrompida; parte dos processos pode ter sido cadastrada. " +
              "Buscar de novo cadastra só o que falta.",
        );
        setEtapa("erro");
      }
    },
    [previa, subgrupoId],
  );

  const recomecar = useCallback(() => {
    buscaAtual.current++;
    setEtapa("formulario");
    setPrevia(null);
    setResultado(null);
    setErro("");
    setProgresso(null);
  }, []);

  return { etapa, previa, resultado, erro, progresso, buscar, importar, recomecar };
}
