import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { OpcaoDeSelect, OpcoesBuscaveis } from "../types";

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
export function useListaBuscavel<R>(
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
