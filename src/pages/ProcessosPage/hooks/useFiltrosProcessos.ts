import { useEstadoNaUrl } from "../../../hooks/useEstadoNaUrl";
import { useParametrosDaUrl } from "../../../hooks/useParametrosDaUrl";
import { lerParametroDaUrl } from "../../../utils/parametrosDaUrl";

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
  const [buscaInput, setBuscaInput] = useEstadoNaUrl("busca", buscaInicial ?? "", { tambemApaga: ["pagina"] });
  const busca = useValorComEspera(buscaInput);
  /** Os iniciais só valem na PRIMEIRA montagem, de propósito: eles vêm da
   * Área de trabalho, onde clicar num número abre esta tela já filtrada. Se
   * reagissem a mudanças da prop, limpar o filtro aqui seria desfeito no
   * render seguinte. */
  /* 🔴 UM parâmetro de URL por filtro, e não o objeto inteiro serializado.
     A URL é endereço: `?situacao=a&situacao=b&pagina=2` se lê, se edita e se
     manda para alguém. Um JSON espremido ali seria estado escondido à vista.

     ⚠️ Os filtros vão para a URL JUNTO com a página, e não é capricho:
     restaurar "página 2" sem o filtro que a produziu mostraria uma página 2
     diferente -- pior do que não restaurar nada.

     🔴 Lidos aqui, escritos NUMA VEZ SÓ em `aplicar`. Um setter por campo não
     serve: escolher um cliente muda DOIS parâmetros (o id e o nome do
     rótulo), e duas escritas seguidas partem da mesma URL -- a segunda apaga
     a primeira. Foi assim que a pílula de cliente ficou acesa sem filtrar. */
  const { params, atualizar } = useParametrosDaUrl();

  const aplicados: FiltrosProcessos = {
    clienteId: lerParametroDaUrl(params, "cliente", iniciais?.clienteId ?? ""),
    /* ⚠️ O NOME do cliente vai na URL, e é a única coisa aqui que não filtra
       nada. Sem ele, voltar do detalhe (ou abrir um link) deixaria a pílula
       acesa e sem rótulo: a lista de clientes é paginada, e o escolhido quase
       nunca está na primeira página. Ele continua FORA do objeto `filtros`,
       que é o que vira `queryKey` -- essa era a razão original de separá-lo. */
    clienteNome: lerParametroDaUrl(params, "cliente_nome", iniciais?.clienteNome ?? ""),
    subgrupoId: lerParametroDaUrl(params, "subgrupo", iniciais?.subgrupoId ?? ""),
    faseIds: lerParametroDaUrl(params, "fase", iniciais?.faseIds ?? []),
    situacaoIds: lerParametroDaUrl(params, "situacao", iniciais?.situacaoIds ?? []),
    dataVerificarAte: lerParametroDaUrl(params, "verificar_ate", iniciais?.dataVerificarAte ?? ""),
    prazoFinalAte: lerParametroDaUrl(params, "prazo_ate", iniciais?.prazoFinalAte ?? ""),
    responsavelId: lerParametroDaUrl(params, "responsavel", iniciais?.responsavelId ?? ""),
  };

  /** Mudar filtro SEMPRE volta para a página 1 -- pedir a página 2 do
   * conjunto novo dá lista vazia sem motivo aparente. */
  function aplicar(parcial: Partial<FiltrosProcessos>) {
    const mudancas: Record<string, string | string[]> = {};
    if (parcial.clienteId !== undefined) mudancas.cliente = parcial.clienteId;
    if (parcial.clienteNome !== undefined) mudancas.cliente_nome = parcial.clienteNome;
    if (parcial.subgrupoId !== undefined) mudancas.subgrupo = parcial.subgrupoId;
    if (parcial.faseIds !== undefined) mudancas.fase = parcial.faseIds;
    if (parcial.situacaoIds !== undefined) mudancas.situacao = parcial.situacaoIds;
    if (parcial.dataVerificarAte !== undefined) mudancas.verificar_ate = parcial.dataVerificarAte;
    if (parcial.prazoFinalAte !== undefined) mudancas.prazo_ate = parcial.prazoFinalAte;
    if (parcial.responsavelId !== undefined) mudancas.responsavel = parcial.responsavelId;
    atualizar(mudancas, { tambemApaga: ["pagina"] });
  }

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
  const semResponsavel = aplicados.responsavelId === SEM_RESPONSAVEL;
  /** O que VAI para o servidor -- `responsavelId` acima é o que a pílula
     escolheu, e os dois não são a mesma coisa (ver o 🔴 logo acima). */
  const responsavelNaConsulta = semResponsavel
    ? ""
    : aplicados.responsavelId === RESPONSAVEL_EU
      ? getEmail() ?? ""
      : aplicados.responsavelId;

  const filtros = {
    busca,
    clienteId: aplicados.clienteId,
    subgrupoId: aplicados.subgrupoId,
    faseIds: aplicados.faseIds,
    situacaoIds: aplicados.situacaoIds,
    dataVerificarAte: aplicados.dataVerificarAte,
    prazoFinalAte: aplicados.prazoFinalAte,
    responsavelId: responsavelNaConsulta,
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
    mudar: aplicar,
    limpar: () => {
      aplicar(FILTROS_PROCESSOS_VAZIOS);
      setBuscaInput("");
    },
  };
}
