import { useState } from "react";

import { useValorComEspera } from "../../../hooks/useValorComEspera";
import { FILTROS_PROCESSOS_VAZIOS } from "../constants";
import { temFiltroAtivo } from "../../../services/api/processos";
import type { FiltrosProcessos } from "../../../types";

/** Estado de filtro da tela de Processos.
 *
 * ⚠️ Não existe mais "rascunho" nem "aplicar". Com os filtros em chips
 * inline (como no artifact), escolher já filtra -- o passo de confirmar
 * fazia sentido num painel com cinco campos abertos ao mesmo tempo, e virou
 * atrito quando cada filtro é um clique isolado.
 *
 * ⚠️ A busca usa DEBOUNCE (`useValorComEspera`), não `useDeferredValue`.
 * Aquele estava aqui como se fosse debounce e não é: não tem componente de
 * tempo, só pula valores intermediários quando o render é lento. Nesta
 * tabela ele é rápido, então cada tecla virava uma `queryKey` nova, uma
 * requisição e uma piscada.
 */
export function useFiltrosProcessos(
  iniciais?: Partial<FiltrosProcessos>,
  buscaInicial?: string,
) {
  /** `buscaInicial` vem do link `?processo=X` do e-mail. Sem ele, quem
   * clicava naquele link esperava o carregamento e chegava numa listagem
   * genérica, sem filtro e sem destaque, sem entender por que estava ali --
   * o número do processo ia junto na navegação e ninguém lia. */
  const [buscaInput, setBuscaInput] = useState(buscaInicial ?? "");
  const busca = useValorComEspera(buscaInput);
  /** Os iniciais só valem na PRIMEIRA montagem, de propósito: eles vêm da
   * Área de trabalho, onde clicar num número abre esta tela já filtrada. Se
   * reagissem a mudanças da prop, limpar o filtro aqui seria desfeito no
   * render seguinte. */
  const [aplicados, setAplicados] = useState<FiltrosProcessos>({
    ...FILTROS_PROCESSOS_VAZIOS,
    ...iniciais,
  });

  /* ⚠️ `clienteNome` fica DE FORA: este objeto vira `queryKey` e query
     string. O nome é rótulo de tela, não critério de busca -- deixá-lo aqui
     faria a mesma consulta virar duas entradas de cache (id com nome e id
     sem nome, que é o que chega pelo atalho da Área de trabalho) e faria
     `temFiltroAtivo` contar um filtro que não filtra nada. */
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
    /** Só pra desenhar o rótulo da pílula -- ver `FiltrosProcessos`. */
    clienteNome: aplicados.clienteNome,
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
