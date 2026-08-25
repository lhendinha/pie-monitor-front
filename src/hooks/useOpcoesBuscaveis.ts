import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PRIMEIRA_PAGINA_DE_OPCOES } from "../constants/busca";
import { listarClientes, listarMembrosDoGrupo, listarSubgrupos } from "../services";
import { qk } from "../services/queryKeys";
import type { OpcaoDeSelect } from "../types";
import type {
  RespostaDeClientes,
  RespostaDeMembros,
  RespostaDeSubgrupos,
} from "../types/respostas";

/** O que uma pílula de filtro precisa receber pra se completar por busca. */
export interface OpcoesBuscaveis {
  /** O que a PÍLULA mostra: a primeira página, ou o resultado da busca em
   * curso. Encolhe conforme a pessoa digita. */
  opcoes: OpcaoDeSelect[];
  /** A primeira página, SEM busca -- o que a página deve usar pra tudo que
   * não é a lista da pílula: escolher o quadro padrão, saber se existe algum
   * subgrupo, decidir se o botão de criar fica habilitado.
   *
   * 🔴 Separado de `opcoes` porque digitar é da PÍLULA, e a página lia a
   * mesma lista. Três defeitos saíram disso, todos reproduzidos em Chrome:
   * buscar "zzz" e fechar sem escolher desabilitava o "Nova tarefa" da
   * Agenda (a página passava a achar que não existe subgrupo nenhum); o
   * quadro do Kanban podia trocar sozinho enquanto se digitava; e a Agenda
   * passava a considerar só os subgrupos que casavam com o termo.
   *
   * ⚠️ Só é preenchida com `sempreLigada`. Nas pílulas preguiçosas nada na
   * página deriva da lista -- se derivasse, a página dependeria de alguém
   * abrir o filtro. */
  primeiraPagina: OpcaoDeSelect[];
  /** Uma busca está em voo. Serve pro PAINEL (esmaecer a lista, mostrar a
   * faixa) -- e não pra tela, que não pode piscar a cada tecla. */
  carregando: boolean;
  /** Ainda não chegou NADA. É esta que a tela usa pro esqueleto.
   *
   * 🔴 A tela usava `carregando`, que inclui a espera de cada busca: digitar
   * na pílula de subgrupo do Kanban trocava o quadro inteiro por um
   * esqueleto, letra a letra. Não aparecia na máquina local, onde a resposta
   * é instantânea; apareceu com 700ms de latência. */
  carregandoPrimeiraVez: boolean;
  erro: boolean;
  /** Entra em `onBuscar` do `Select`/`MultiSelect`. A primeira chamada
   * (termo vazio, no momento em que o painel abre) é o que liga a consulta. */
  buscar: (termo: string) => void;
  tentarDeNovo: () => void;
}

/** Primeira página + busca no servidor, pras listas que crescem sem limite.
 *
 * 🔴 **Nada é pedido antes de a pílula abrir.** A consulta nasce desligada e
 * quem a liga é a primeira chamada de `buscar`, que o painel dispara ao
 * abrir. Era esse o custo a eliminar: a tela de Processos baixava o catálogo
 * inteiro de clientes no carregamento -- inclusive pra quem nunca ia tocar no
 * filtro -- e a coluna mostrava id cru enquanto isso.
 *
 * ⚠️ `keepPreviousData` não é detalhe de cache: é ele que deixa o resultado
 * anterior na tela enquanto o próximo vem, e é sobre ele que o painel
 * desenha a faixa "Buscando…". Sem isso a lista esvazia a cada tecla e o
 * painel pisca do conteúdo pro vazio e de volta.
 */
function useListaBuscavel<R>(
  chave: (busca: string) => readonly unknown[],
  pedir: (busca: string) => Promise<R>,
  paraOpcoes: (resposta: R) => OpcaoDeSelect[],
  sempreLigada = false,
): OpcoesBuscaveis {
  const [ligada, setLigada] = useState(sempreLigada);
  const [termo, setTermo] = useState("");

  const query = useQuery<R>({
    queryKey: chave(termo),
    queryFn: () => pedir(termo),
    enabled: ligada,
    placeholderData: keepPreviousData,
  });

  /* A primeira página, presa ao termo VAZIO. Enquanto `termo` é "", as duas
     consultas dividem a mesma chave e o React Query faz uma requisição só;
     quando a pessoa digita, esta continua servindo o resultado sem busca, do
     cache. É de propósito uma consulta e não uma cópia guardada à mão: cópia
     à mão envelhece calada quando alguém cadastra um subgrupo novo. */
  const base = useQuery<R>({
    queryKey: chave(""),
    queryFn: () => pedir(""),
    enabled: sempreLigada,
  });

  return {
    opcoes: query.data ? paraOpcoes(query.data) : [],
    primeiraPagina: base.data ? paraOpcoes(base.data) : [],
    carregandoPrimeiraVez: sempreLigada ? base.isPending : ligada && query.isPending,
    /* Duas esperas diferentes de propósito, e o painel as distingue: sem
       lista, `isPending` vira "Carregando…"; com lista velha na tela,
       `isPlaceholderData` vira a faixa "Buscando…" por cima dela.
       ⚠️ E nenhuma das duas quando FALHOU -- a espera acabou, mal. */
    carregando: ligada && !query.isError && (query.isPending || query.isPlaceholderData),
    erro: query.isError,
    buscar: useCallback((t: string) => {
      setLigada(true);
      setTermo(t);
    }, []),
    tentarDeNovo: useCallback(() => {
      void query.refetch();
    }, [query]),
  };
}

const PAGINA = { tamanhoPagina: PRIMEIRA_PAGINA_DE_OPCOES };

export function useClientesBuscaveis(): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeClientes>(
    (busca) => qk.clientes({ ...PAGINA, busca }),
    (busca) => listarClientes({ ...PAGINA, busca }) as Promise<RespostaDeClientes>,
    (r) => (r.clientes || []).map((c) => ({ value: c.cliente_id, label: c.nome })),
  );
}

/** @param sempreLigada Pede a primeira página JÁ NA MONTAGEM, sem esperar a
 * pílula abrir.
 *
 * Existe pro Kanban e pra Agenda, e por um motivo específico: nelas o
 * subgrupo não é filtro, é QUAL QUADRO a tela mostra. Sem uma lista na
 * montagem não há como escolher um padrão, e a tela abriria em branco
 * esperando um clique que quase sempre é o mesmo.
 *
 * ⚠️ Continua sendo a primeira PÁGINA (50), não o catálogo -- o que mudou é
 * o momento, não o tamanho. */
export function useSubgruposBuscaveis(sempreLigada = false): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeSubgrupos>(
    (busca) => qk.subgrupos({ ...PAGINA, busca }),
    (busca) => listarSubgrupos({ ...PAGINA, busca }) as Promise<RespostaDeSubgrupos>,
    (r) => (r.subgrupos || []).map((s) => ({ value: s.subgrupo_id, label: s.nome })),
    sempreLigada,
  );
}

export function usePessoasBuscaveis(): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeMembros>(
    (busca) => qk.membros({ ...PAGINA, busca }),
    (busca) => listarMembrosDoGrupo({ ...PAGINA, busca }) as Promise<RespostaDeMembros>,
    /* Apelido quando existe, e-mail quando não -- quem foi convidado hoje
       ainda não tem apelido, e some de um seletor que só oferece apelido. */
    (r) => (r.membros || []).map((m) => ({ value: m.email, label: m.apelido || m.email })),
  );
}

/** Garante que o item ESCOLHIDO tenha rótulo, mesmo fora da página atual.
 *
 * 🔴 A pílula desenha o rótulo procurando o valor entre as opções. Com só a
 * primeira página carregada, o cliente escolhido ontem quase nunca está
 * nela: a pílula ficava azul (filtro ligado) e sem texto, ou mostrando o id
 * cru. É por isso que o NOME do escolhido é guardado junto do id no estado
 * do filtro -- ele não pode depender de a lista certa estar na tela.
 */
export function comOpcaoEscolhida(
  opcoes: OpcaoDeSelect[],
  valor: string,
  rotulo: string,
): OpcaoDeSelect[] {
  if (!valor || opcoes.some((o) => o.value === valor)) return opcoes;
  return [{ value: valor, label: rotulo || valor }, ...opcoes];
}

/** Versão de `comOpcaoEscolhida` pra escolha MÚLTIPLA.
 *
 * 🔴 Aqui o estrago é maior que um rótulo feio. O `MultiSelect` monta o
 * `value` filtrando as opções pelos ids escolhidos: id que não está na lista
 * carregada simplesmente SOME do valor -- a pílula passa de "3 selecionados"
 * pra "1", sem ninguém ter desmarcado nada, e aplicar gravaria essa perda.
 */
export function comOpcoesEscolhidas(
  opcoes: OpcaoDeSelect[],
  valores: string[],
  nomes: Record<string, string>,
): OpcaoDeSelect[] {
  const presentes = new Set(opcoes.map((o) => o.value));
  const faltantes = valores
    .filter((v) => !presentes.has(v))
    .map((v) => ({ value: v, label: nomes[v] || v }));
  return faltantes.length ? [...faltantes, ...opcoes] : opcoes;
}
