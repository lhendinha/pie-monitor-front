import { useDeferredValue, useState } from "react";

import { FILTROS_PROCESSOS_VAZIOS } from "../constants/processos";
import { temFiltroAtivo } from "../../../services/api/processos";
import type { FiltrosProcessos } from "../../../types";

/** Estado de filtro da tela de Processos.
 *
 * ⚠️ Não existe mais "rascunho" nem "aplicar". Com os filtros em chips
 * inline (como no artifact), escolher já filtra -- o passo de confirmar
 * fazia sentido num painel com cinco campos abertos ao mesmo tempo, e virou
 * atrito quando cada filtro é um clique isolado.
 *
 * `useDeferredValue` na busca, em vez de debounce com `setTimeout`: o React
 * adia o valor derivado enquanto a digitação está rápida, sem `useEffect`
 * nem timer pra limpar.
 */
export function useFiltrosProcessos(iniciais?: Partial<FiltrosProcessos>) {
  const [buscaInput, setBuscaInput] = useState("");
  const busca = useDeferredValue(buscaInput);
  /** Os iniciais só valem na PRIMEIRA montagem, de propósito: eles vêm da
   * Área de trabalho, onde clicar num número abre esta tela já filtrada. Se
   * reagissem a mudanças da prop, limpar o filtro aqui seria desfeito no
   * render seguinte. */
  const [aplicados, setAplicados] = useState<FiltrosProcessos>({
    ...FILTROS_PROCESSOS_VAZIOS,
    ...iniciais,
  });

  const filtros = {
    busca,
    clienteId: aplicados.clienteId,
    faseIds: aplicados.faseIds,
    situacaoIds: aplicados.situacaoIds,
    dataVerificarAte: aplicados.dataVerificarAte,
    prazoFinalAte: aplicados.prazoFinalAte,
  };

  return {
    buscaInput,
    setBuscaInput,
    filtros,
    filtroAtivo: temFiltroAtivo(filtros),
    aplicados,
    mudar: (parcial: Partial<FiltrosProcessos>) =>
      setAplicados((f) => ({ ...f, ...parcial })),
    limpar: () => {
      setAplicados(FILTROS_PROCESSOS_VAZIOS);
      setBuscaInput("");
    },
  };
}
