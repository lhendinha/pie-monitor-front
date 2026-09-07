import { Box, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeTexto,
  CabecalhoDePagina,
  CartaoDeTabela,
  Esqueleto,
  EstadoDeErro,
  IconeSeta,
  ModalDeConfirmacao,
  OpcaoDeLinha,
} from "../../components";
import {
  NATUREZA_ENTRADA,
  SITUACAO_EFETIVADO,
  TIPO_TRANSFERENCIA,
} from "../../constants";
import { useToast } from "../../contexts/ToastContext";
import { useNomeDeSubgrupo } from "../../hooks/useNomeDeSubgrupo";
import { useVoltarParaLista } from "../../hooks/useVoltarParaLista";
import {
  detalheLancamento,
  efetivarLancamento,
  excluirLancamento,
  lerCatalogoFinanceiro,
  papelAtende,
  reabrirLancamento,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import type { CatalogoFinanceiro, EscopoDaSerie, Lancamento } from "../../types";
import DadosDoLancamento from "./components/DadosDoLancamento";

/** A tela de um lançamento: o que ele é, e as ações que mexem em dinheiro.
 *
 * É ROTA, e não modal, pela mesma razão do detalhe de documento: precisa
 * sobreviver a um F5 e a um link colado.
 *
 * 🔴 **Dar baixa e excluir vivem AQUI, e não na linha da lista.** As duas
 * mexem no saldo de uma conta, e um clique de raspão numa tabela de vinte
 * linhas é barato demais para isso. Aqui a pessoa já está olhando para o
 * lançamento inteiro -- valor, conta, rateio -- antes de confirmar.
 *
 * 🔴 **Cada botão só aparece quando o servidor aceitaria.** As três regras
 * vêm de `efetivacao_service` e foram lidas lá, não supostas:
 *
 * - transferência não efetiva ("já nasce efetivada") nem reabre -> 400;
 * - lançamento em fatura não reabre nem se exclui -> 409;
 * - excluir é `admin`+.
 *
 * Mostrar o botão e deixar o toast explicar depois seria prometer o que não
 * se cumpre -- a mesma régua do resto do sistema. O subtítulo diz o motivo
 * no lugar do botão que não veio.
 *
 * ➡️ `index.test.tsx`.
 */
export default function LancamentoDetalhePage() {
  const { lancamentoId = "" } = useParams();
  /* ⚠️ Volta no HISTÓRICO -- é o que preserva os filtros e a página da
     lista de onde a pessoa veio. Ver `useVoltarParaLista`. */
  const voltar = useVoltarParaLista("/financeiro?aba=lancamentos");
  const queryClient = useQueryClient();
  const toast = useToast();
  const nomeDeSubgrupo = useNomeDeSubgrupo();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [escopo, setEscopo] = useState<EscopoDaSerie>("este");

  const query = useQuery<Lancamento>({
    queryKey: qk.lancamento(lancamentoId),
    queryFn: () => detalheLancamento(lancamentoId),
    enabled: Boolean(lancamentoId),
    /* ⚠️ Link velho aponta para lançamento excluído. Retentar um 404 três
       vezes só atrasa o recado em alguns segundos. */
    retry: false,
  });

  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });

  /** 🔴 Derruba as LISTAS e o catálogo junto, não só este lançamento: dar
   * baixa move o saldo da conta, e o saldo aparece na aba Configurações e
   * nos cartões de totais. Invalidar só o detalhe deixaria o número velho
   * nas outras telas até alguém recarregar. */
  function invalidarDinheiro() {
    queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    queryClient.invalidateQueries({ queryKey: qk.catalogoFinanceiro() });
  }

  const efetivar = useMutation({
    mutationFn: () => efetivarLancamento(lancamentoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.lancamento(lancamentoId) });
      invalidarDinheiro();
      toast.sucesso("Baixa registrada.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível registrar a baixa."),
  });

  const reabrir = useMutation({
    mutationFn: () => reabrirLancamento(lancamentoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.lancamento(lancamentoId) });
      invalidarDinheiro();
      toast.sucesso("Baixa desfeita.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível desfazer a baixa."),
  });

  const excluir = useMutation({
    mutationFn: () => excluirLancamento(lancamentoId, escopo),
    onSuccess: (resposta: { removidos?: number }) => {
      invalidarDinheiro();
      /* ⚠️ O número vem do SERVIDOR: quem entrou numa fatura entre a leitura
         e o clique não é apagado, e `escopo=futuros` pode remover menos do
         que a lista mostrava. Dizer "3 excluídos" por conta própria seria
         inventar. */
      const quantos = resposta?.removidos ?? 1;
      toast.sucesso(quantos > 1 ? `${quantos} lançamentos excluídos.` : "Lançamento excluído.");
      voltar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir o lançamento."),
  });

  const cabecalhoDeVolta = (
    <Box mb="14px">
      <BotaoDeTexto onClick={voltar}>
        <IconeSeta />
        Voltar
      </BotaoDeTexto>
    </Box>
  );

  if (query.isPending) {
    return (
      <Box>
        {cabecalhoDeVolta}
        <Esqueleto linhas={6} />
      </Box>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Box>
        {cabecalhoDeVolta}
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar este lançamento. Ele pode ter sido excluído."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      </Box>
    );
  }

  const lancamento = query.data;
  const efetivado = lancamento.situacao === SITUACAO_EFETIVADO;
  const eEntrada = lancamento.natureza === NATUREZA_ENTRADA;
  const eTransferencia = lancamento.tipo === TIPO_TRANSFERENCIA;
  const emFatura = Boolean(lancamento.fatura_id);
  const naSerie = Boolean(lancamento.recorrencia_id);

  const podeExcluir = papelAtende("admin") && !emFatura;
  const podeDarBaixa = !eTransferencia && !efetivado;
  const podeDesfazer = !eTransferencia && efetivado && !emFatura;

  /** O motivo de a tela não oferecer o que a pessoa espera. Vazio quando
   * não há motivo -- e aí o subtítulo é o de sempre. */
  const impedimento = emFatura
    ? "Está numa fatura: cancele a fatura antes de desfazer a baixa ou excluir."
    : eTransferencia
      ? "Transferência já nasce efetivada; para corrigir, exclua e refaça."
      : "";

  return (
    <Box>
      {cabecalhoDeVolta}

      <CabecalhoDePagina
        titulo={lancamento.descricao}
        subtitulo={impedimento || undefined}
        acoes={
          <Flex gap="8px" wrap="wrap">
            {podeDarBaixa && (
              <Botao onClick={() => efetivar.mutate()} disabled={efetivar.isPending}>
                {eEntrada ? "Marcar como recebido" : "Marcar como pago"}
              </Botao>
            )}
            {/* 🔴 "Desfazer" no lugar de "Marcar como…", nunca os dois: um
                botão que reafirma o que já aconteceu convida ao clique que
                mexe no saldo de novo. */}
            {podeDesfazer && (
              <Botao variante="ghost" onClick={() => reabrir.mutate()} disabled={reabrir.isPending}>
                Desfazer baixa
              </Botao>
            )}
            {podeExcluir && (
              <Botao
                variante="perigoContorno"
                onClick={() => {
                  /* ⚠️ Reabre sempre em "este": a escolha da vez passada não
                     pode virar padrão silencioso de uma exclusão em série. */
                  setEscopo("este");
                  setConfirmandoExclusao(true);
                }}
              >
                Excluir
              </Botao>
            )}
          </Flex>
        }
      />

      <CartaoDeTabela>
        <DadosDoLancamento
          lancamento={lancamento}
          catalogo={catalogo.data}
          nomeDoDepartamento={nomeDeSubgrupo}
        />
      </CartaoDeTabela>

      {confirmandoExclusao && (
        <ModalDeConfirmacao
          titulo="Excluir lançamento"
          mensagem={
            <>
              O lançamento <strong>{lancamento.descricao}</strong> será removido.
            </>
          }
          /* 🔴 A pergunta do Google Agenda, e SÓ quando há série: sem irmãos
             o servidor ignora o escopo, e oferecer a escolha pediria uma
             decisão que não muda nada. */
          escolha={
            naSerie ? (
              <Box>
                <OpcaoDeLinha ativa={escopo === "este"} onClick={() => setEscopo("este")}>
                  Somente este
                </OpcaoDeLinha>
                <OpcaoDeLinha ativa={escopo === "futuros"} onClick={() => setEscopo("futuros")}>
                  Este e os próximos em aberto
                </OpcaoDeLinha>
              </Box>
            ) : undefined
          }
          /* 🔴 O aviso fala do DINHEIRO, não só de "não dá para desfazer":
             num efetivado, excluir devolve o valor ao saldo da conta -- e
             quem confirma precisa saber disso antes, não depois de estranhar
             o extrato. */
          aviso={
            efetivado
              ? "Este lançamento já foi baixado: o valor volta para o saldo da conta."
              : undefined
          }
          confirmando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmandoExclusao(false)}
        />
      )}
    </Box>
  );
}
