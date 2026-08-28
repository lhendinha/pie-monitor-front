import { useState } from "react";

import { useValorComEspera } from "../../../hooks/useValorComEspera";
import { FILTROS_PROCESSOS_VAZIOS, RESPONSAVEL_EU, SEM_RESPONSAVEL } from "../constants";
import { getEmail } from "../../../services";
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
  /* 🔴 UM campo na tela vira DOIS parâmetros na consulta.
     A pílula guarda uma escolha só, mas "sem responsável" não pode viajar
     como `responsavel_id=""`: `montarQuery` descarta valor vazio e o servidor
     lê `""` como "não filtrar" -- o pedido nem sairia do navegador, e a tela
     mostraria a lista inteira parecendo filtrada.

     E "eu" é resolvido AQUI, no front: o servidor não precisa saber o que
     "eu" significa. */
  const escolhido = aplicados.responsavelId;
  const semResponsavel = escolhido === SEM_RESPONSAVEL;
  const responsavelId = semResponsavel
    ? ""
    : escolhido === RESPONSAVEL_EU
      ? getEmail() ?? ""
      : escolhido;

  const filtros = {
    busca,
    clienteId: aplicados.clienteId,
    subgrupoId: aplicados.subgrupoId,
    faseIds: aplicados.faseIds,
    situacaoIds: aplicados.situacaoIds,
    dataVerificarAte: aplicados.dataVerificarAte,
    prazoFinalAte: aplicados.prazoFinalAte,
    responsavelId,
    semResponsavel,
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
