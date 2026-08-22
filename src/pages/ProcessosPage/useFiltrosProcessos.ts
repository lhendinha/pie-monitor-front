import { useDeferredValue, useState } from "react";

import { FILTROS_PROCESSOS_VAZIOS } from "../../constants";
import { temFiltroAtivo } from "../../services/api/processos";
import type { FiltrosEstruturadosProcessos } from "../../types";

/** Todo o estado de filtro da tela de Processos, num lugar só.
 *
 * Duas sutilezas que vieram do arquivo original e não podem se perder:
 *
 * 1. **Rascunho separado do aplicado.** O painel edita `rascunho`; só
 *    "Aplicar filtros" o promove a `aplicados`. Sem isso, cada campo trocado
 *    dispararia um fetch enquanto a pessoa ainda está montando o filtro.
 * 2. **`useDeferredValue` na busca**, em vez de debounce com `setTimeout`.
 *    O React adia o valor derivado enquanto a digitação está rápida, sem
 *    `useEffect` nem timer pra limpar.
 */
export function useFiltrosProcessos() {
  const [buscaInput, setBuscaInput] = useState("");
  const busca = useDeferredValue(buscaInput);

  const [painelAberto, setPainelAberto] = useState(false);
  const [aplicados, setAplicados] = useState<FiltrosEstruturadosProcessos>(FILTROS_PROCESSOS_VAZIOS);
  const [rascunho, setRascunho] = useState<FiltrosEstruturadosProcessos>(FILTROS_PROCESSOS_VAZIOS);

  const filtros = {
    busca,
    clienteId: aplicados.clienteId,
    faseId: aplicados.faseId,
    situacaoId: aplicados.situacaoId,
    dataVerificarAte: aplicados.dataVerificarAte,
    prazoFinalAte: aplicados.prazoFinalAte,
  };

  /** Abrir o painel copia o aplicado pro rascunho -- senão o painel abriria
   * mostrando o que a pessoa digitou e abandonou da última vez. */
  function alternarPainel() {
    if (!painelAberto) setRascunho(aplicados);
    setPainelAberto((v) => !v);
  }

  function aplicar() {
    setAplicados(rascunho);
    setPainelAberto(false);
  }

  function limpar() {
    setRascunho(FILTROS_PROCESSOS_VAZIOS);
    setAplicados(FILTROS_PROCESSOS_VAZIOS);
  }

  /** Remove um filtro pelo chip. Mexe nos DOIS estados: só no aplicado
   * faria o chip sumir e voltar assim que o painel reabrisse. */
  function remover(chave: keyof FiltrosEstruturadosProcessos) {
    setAplicados((f) => ({ ...f, [chave]: "" }));
    setRascunho((r) => ({ ...r, [chave]: "" }));
  }

  return {
    buscaInput,
    setBuscaInput,
    filtros,
    filtroAtivo: temFiltroAtivo(filtros),
    aplicados,
    rascunho,
    setRascunho,
    painelAberto,
    alternarPainel,
    aplicar,
    limpar,
    remover,
    quantidadeAplicados: Object.values(aplicados).filter(Boolean).length,
  };
}
