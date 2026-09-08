import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AreaAtualizando,
  Cartao,
  EstadoDeErro,
  EstadoVazio,
  Esqueleto,
  Pagination,
} from "../../../../components";
import { NATUREZA_ENTRADA } from "../../../../constants";
import { useToast } from "../../../../contexts/ToastContext";
import { efetivarLancamento, listarLancamentos } from "../../../../services";
import { invalidarCatalogoFinanceiro, toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar } from "../../../../utils";
import BotaoDeConcluir from "../BotaoDeConcluir";
import LinhaDeVencimento from "../LinhaDeVencimento";
import { TAMANHOS_PAGINA_CARD, TAMANHO_PAGINA_CARD_PADRAO } from "../../constants";
import type { Lancamento } from "../../../../types";
import type { RespostaDeLancamentos } from "../../../../types/respostas";
import type { CardDeVencimentosProps } from "./types";

/** "Vence esta semana": o que ainda não entrou nem saiu e vence na janela --
 * atrasados inclusive.
 *
 * 🔴 **Lê a rota PRÓPRIA (`vencendo=N`), e não o resumo.** É a mesma leitura
 * que gera a linha "A pagar até N dias" do Resumo rápido, do lado do
 * servidor: os dois números batem por construção, e não por coincidência.
 *
 * 🔴 **Sem limite inferior**: o atrasado de meses atrás continua vencendo, e
 * escondê-lo faria o card dizer que a semana está tranquila enquanto três
 * contas estão vencidas.
 *
 * ⚠️ **Sem rodapé de link**, ao contrário dos cards de tarefa: as linhas do
 * Resumo rápido já abrem a lista filtrada, e um terceiro caminho para a
 * mesma tela é ruído.
 *
 * ⚠️ **O card não aparece para quem não é `financeiro`**: quem monta é a
 * página, pela mesma régua das linhas do resumo -- se a chave do dinheiro
 * não veio, não há card.
 *
 * ➡️ `../../index.test.tsx`.
 */
export default function CardDeVencimentos({ dias }: CardDeVencimentosProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number>(TAMANHO_PAGINA_CARD_PADRAO);

  const parametros = { vencendo: dias, pagina, tamanhoPagina };
  const query = useQuery<RespostaDeLancamentos>({
    queryKey: qk.lancamentos(parametros),
    queryFn: () => listarLancamentos(parametros),
    /* Mantém a página anterior enquanto a nova vem -- sem isto o card
       colapsa de altura a cada clique e a coluna inteira salta. */
    placeholderData: keepPreviousData,
  });
  useToastOnQueryError(query.error, 'Não foi possível carregar "Vence esta semana".');

  const efetivar = useMutation({
    mutationFn: (lancamento: Lancamento) => efetivarLancamento(lancamento.lancamento_id),
    onSuccess: (_dado, lancamento) => {
      /* 🔴 Derruba o RESUMO junto: dar baixa muda as três somas e o saldo, e
         invalidar só a lista deixaria o número velho logo ao lado, na mesma
         tela. */
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
      queryClient.invalidateQueries({ queryKey: qk.resumo() });
      invalidarCatalogoFinanceiro(queryClient);
      toast.sucesso(
        lancamento.natureza === NATUREZA_ENTRADA ? "Recebimento registrado." : "Pagamento registrado.",
      );
    },
    /* ⚠️ O 409 de quem já foi baixado por outra pessoa vem como toast E a
       lista relê: o recado sozinho deixaria a linha na tela, convidando ao
       segundo clique. */
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
      queryClient.invalidateQueries({ queryKey: qk.resumo() });
      toastErroMutation(toast, err, "Não foi possível registrar a baixa.");
    },
  });

  const lancamentos = query.data?.lancamentos ?? [];
  const total = query.data?.total ?? 0;

  return (
    <Cartao
      titulo="Vence esta semana"
      acoes={
        total > 0 ? (
          <Text fontSize="11.5px" fontWeight="700" color="fg.subtle" fontFamily="mono">
            {contar(total, "lançamento", "lançamentos")}
          </Text>
        ) : undefined
      }
    >
      {query.isError ? (
        /* "Nada vence esta semana" numa falha de rede é o pior recado
           possível: o vazio deste card é uma boa notícia -- falsa. */
        <EstadoDeErro
          mensagem='Não foi possível carregar "Vence esta semana".'
          onTentarDeNovo={() => query.refetch()}
          tentando={query.isFetching}
        />
      ) : query.isPending ? (
        <Esqueleto linhas={2} />
      ) : lancamentos.length === 0 ? (
        <EstadoVazio mensagem="Nada vence esta semana." />
      ) : (
        <Box>
          <AreaAtualizando atualizando={query.isPlaceholderData}>
            {lancamentos.map((l) => (
              <LinhaDeVencimento
                key={l.lancamento_id}
                lancamento={l}
                acao={
                  <BotaoDeConcluir
                    rotulo={
                      l.natureza === NATUREZA_ENTRADA
                        ? `Marcar ${l.descricao} como recebido`
                        : `Marcar ${l.descricao} como pago`
                    }
                    /* SÓ o lançamento clicado: travar a lista inteira esconde
                       qual deles está indo. */
                    desabilitado={
                      efetivar.isPending
                      && efetivar.variables?.lancamento_id === l.lancamento_id
                    }
                    onConcluir={() => efetivar.mutate(l)}
                  />
                }
              />
            ))}
          </AreaAtualizando>
          <Pagination
            pagina={pagina}
            totalPaginas={query.data?.total_paginas ?? 0}
            total={total}
            tamanhoPagina={tamanhoPagina}
            tamanhos={TAMANHOS_PAGINA_CARD}
            onMudarPagina={setPagina}
            onMudarTamanho={(t) => {
              setTamanhoPagina(t);
              setPagina(1);
            }}
          />
        </Box>
      )}
    </Cartao>
  );
}
