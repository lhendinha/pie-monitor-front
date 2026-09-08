import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeTexto,
  CartaoDeTabela,
  Esqueleto,
  EstadoDeErro,
  Etiqueta,
  EtiquetaDeMetadado,
  IconeSeta,
  ModalDeConfirmacao,
} from "../../components";
import { FATURA_ABERTA, FATURA_PAGA } from "../../constants";
import { useToast } from "../../contexts/ToastContext";
import { useVoltarParaLista } from "../../hooks/useVoltarParaLista";
import {
  cancelarFatura,
  detalheCliente,
  detalheFatura,
  lerCatalogoFinanceiro,
  pagarFatura,
} from "../../services";
import { ApiError } from "../../services/api/client";
import { invalidarCatalogoFinanceiro, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { coresDaFatura } from "../../theme/fatura";
import {
  ROTULO_DA_FATURA,
  formatarCentavos,
  formatarData,
  opcoesDeConta,
  situacaoDaFaturaNaTela,
} from "../../utils";
import type { CatalogoFinanceiro, Cliente, FaturaComLancamentos } from "../../types";
import DocumentoDaFatura from "./components/DocumentoDaFatura";
import ModalDePagamento from "./components/ModalDePagamento";

/** A tela de uma fatura: o documento que o cliente recebe, e os dois atos
 * que mudam a situação dele.
 *
 * É ROTA, e não modal, pela mesma razão do detalhe de lançamento: precisa
 * aguentar um F5 e um link colado -- a lista de Emitidas aponta para cá, e
 * a emissão manda para cá assim que a fatura sai.
 *
 * 🔴 **Cada botão só aparece quando o servidor aceitaria.** Pagar e cancelar
 * exigem a fatura ABERTA (`_garantir_aberta` no `faturas_service`): a paga e
 * a cancelada ficam só com "Imprimir". Oferecer um botão que responderia 409
 * seria empurrar para o servidor uma pergunta que a tela já sabe responder.
 *
 * ⚠️ **"Atrasada" continua sendo aberta.** Ela é derivação da tela sobre a
 * data, não uma quarta situação -- e por isso mantém os dois botões.
 *
 * ➡️ `index.test.tsx`.
 */
export default function FaturaDetalhePage() {
  const { faturaId = "" } = useParams();
  /* ⚠️ Volta no HISTÓRICO, o que preserva o período e a página da lista de
     onde a pessoa veio. O endereço de reserva é a sub-aba certa: quem chega
     por link colado não tem histórico, e cair em "A faturar" seria cair na
     outra lista. */
  const voltar = useVoltarParaLista("/financeiro?aba=faturas&secao=emitidas");
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [registrandoPagamento, setRegistrandoPagamento] = useState(false);
  const [erroDoPagamento, setErroDoPagamento] = useState("");

  const query = useQuery<FaturaComLancamentos>({
    queryKey: qk.fatura(faturaId),
    queryFn: () => detalheFatura(faturaId) as Promise<FaturaComLancamentos>,
    enabled: Boolean(faturaId),
    /* ⚠️ Link velho aponta para fatura que não existe: retentar um 404 três
       vezes só atrasa o recado. */
    retry: false,
  });

  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });

  const clienteId = query.data?.cliente_id ?? "";
  /* ⚠️ Pelo ID, e não pela busca: `listarClientes({busca})` procura no NOME,
     e a fatura guarda só o id. Mesma escolha do detalhe de lançamento. */
  const cliente = useQuery<Cliente>({
    queryKey: qk.detalheCliente(clienteId),
    queryFn: () => detalheCliente(clienteId) as Promise<Cliente>,
    enabled: Boolean(clienteId),
    retry: false,
  });

  /** 🔴 Derruba as LISTAS e o catálogo junto: pagar move o saldo de uma
   * conta, e cancelar devolve os lançamentos para "a faturar". Invalidar só
   * o detalhe deixaria o número velho nas outras telas. */
  function releEEspalha() {
    queryClient.invalidateQueries({ queryKey: qk.fatura(faturaId) });
    queryClient.invalidateQueries({ queryKey: ["faturas"] });
    queryClient.invalidateQueries({ queryKey: qk.aFaturar() });
    queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    invalidarCatalogoFinanceiro(queryClient);
  }

  const pagar = useMutation({
    mutationFn: (dados: { pago_em: string; conta_id: string }) =>
      pagarFatura(faturaId, dados),
    onSuccess: () => {
      releEEspalha();
      setRegistrandoPagamento(false);
      setErroDoPagamento("");
      toast.sucesso("Pagamento registrado.");
    },
    /* A recusa vai para o MODAL: ela fala de um campo que está lá ("Conta
       desativada: escolha outra"), e um toast leva o recado embora antes de
       a pessoa achar o campo. */
    onError: (err) =>
      setErroDoPagamento(
        err instanceof ApiError ? err.message : "Não foi possível registrar o pagamento.",
      ),
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarFatura(faturaId),
    onSuccess: () => {
      releEEspalha();
      setConfirmandoCancelamento(false);
      toast.sucesso("Fatura cancelada.");
    },
    onError: (err) => {
      setConfirmandoCancelamento(false);
      toastErroMutation(toast, err, "Não foi possível cancelar a fatura.");
    },
  });

  /* ⚠️ `data-fora-da-impressao`: some no papel. O documento impresso é a
     fatura, não a tela -- ver a regra de `@media print` no tema. */
  const cabecalhoDeVolta = (
    <Box mb="14px" data-fora-da-impressao>
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
            mensagem="Não foi possível carregar esta fatura. Ela pode ter sido excluída."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      </Box>
    );
  }

  const fatura = query.data;
  const situacao = situacaoDaFaturaNaTela(fatura);
  /* 🔴 A situação GRAVADA, não a da tela: "atrasada" é derivação sobre a
     data e continua sendo uma fatura aberta, que se paga e se cancela. */
  const aberta = fatura.situacao === FATURA_ABERTA;

  /** A conta em que o dinheiro caiu, quando TODAS as linhas concordam.
   *
   * 🔴 A fatura não guarda isso -- quem guarda é cada lançamento, cujo
   * `conta_id` a baixa reescreve com a conta do depósito. Vazio quando
   * divergem: escolher uma delas seria inventar. */
  const contas = new Set(fatura.lancamentos.map((l) => l.conta_id).filter(Boolean));
  const contaDoRecebimento =
    contas.size === 1
      ? opcoesDeConta(catalogo.data).find((o) => o.value === [...contas][0])?.label ?? ""
      : "";

  return (
    <Box>
      {cabecalhoDeVolta}

      {/* 🔴 Cabeçalho PRÓPRIO, e não `CabecalhoDePagina`: é o `.cab-detalhe`
          do artefato, com as etiquetas DENTRO do bloco do título. Mesmo
          molde do detalhe de lançamento. */}
      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px">
        <Box>
          <Heading as="h1" fontSize="23px" fontWeight="800" lineHeight="30px"
                   letterSpacing="-0.23px">
            Fatura {fatura.numero}
          </Heading>
          <Flex wrap="wrap" gap="8px" mt="8px" align="center">
            <Etiqueta cores={coresDaFatura(situacao)}>
              {ROTULO_DA_FATURA[situacao] ?? situacao}
            </Etiqueta>
            <EtiquetaDeMetadado>
              {cliente.data?.nome ?? fatura.cliente_id}
            </EtiquetaDeMetadado>
            <EtiquetaDeMetadado>
              Vence {formatarData(fatura.data_vencimento)}
            </EtiquetaDeMetadado>
            <EtiquetaDeMetadado>
              R$ {formatarCentavos(fatura.valor_total_centavos)}
            </EtiquetaDeMetadado>
            {/* O motivo de faltarem os botões, junto das etiquetas de estado
                -- não é subtítulo da tela. */}
            {!aberta && (
              <Text fontSize="12px" color="fg.subtle">
                {fatura.situacao === FATURA_PAGA
                  ? "Fatura paga: não há mais o que registrar nem cancelar."
                  : "Fatura cancelada: os lançamentos voltaram para 'a faturar'."}
              </Text>
            )}
          </Flex>
        </Box>

        <Flex gap="8px" flexShrink={0} wrap="wrap" justify="flex-end"
              data-fora-da-impressao>
          {aberta && (
            <Botao
              variante="perigoContorno"
              onClick={() => setConfirmandoCancelamento(true)}
              disabled={cancelar.isPending}
            >
              Cancelar fatura
            </Botao>
          )}
          {/* ⚠️ "Imprimir" existe nas TRÊS situações: a cancelada também é
              documento, e alguém pode precisar do papel do que foi cancelado. */}
          <Botao variante="ghost" onClick={() => window.print()}>
            Imprimir
          </Botao>
          {aberta && (
            <Botao
              onClick={() => {
                setErroDoPagamento("");
                setRegistrandoPagamento(true);
              }}
            >
              Registrar pagamento
            </Botao>
          )}
        </Flex>
      </Flex>

      {/* ⚠️ `Stack`, e não `Cartao`: o documento já traz os dois cartões
          irmãos dele -- a tabela e os dados. Envolvê-los aqui desenharia
          moldura dentro de moldura, que foi como esta tela nasceu errada. */}
      <Stack gap="14px">
        <DocumentoDaFatura
          fatura={fatura}
          nomeDoCliente={cliente.data?.nome ?? fatura.cliente_id}
          contaDoRecebimento={contaDoRecebimento}
        />
      </Stack>

      {registrandoPagamento && (
        <ModalDePagamento
          numero={fatura.numero}
          valorCentavos={fatura.valor_total_centavos}
          opcoesDeConta={opcoesDeConta(catalogo.data)}
          erro={erroDoPagamento}
          salvando={pagar.isPending}
          onConfirmar={(dados) => pagar.mutate(dados)}
          onFechar={() => setRegistrandoPagamento(false)}
        />
      )}

      {confirmandoCancelamento && (
        <ModalDeConfirmacao
          titulo="Cancelar fatura"
          mensagem={
            <>
              A fatura <strong>{fatura.numero}</strong> deixa de valer, e os
              lançamentos dela voltam para "a faturar".
            </>
          }
          /* 🔴 O número NÃO se reaproveita, e quem cancela precisa saber
             disso ANTES: a próxima fatura sai com o número seguinte, e a
             sequência do escritório fica com um buraco -- que é como nota
             fiscal funciona, e o que o contador espera. */
          aviso={`O número ${fatura.numero} fica gasto: a próxima fatura sai com o seguinte.`}
          rotulo="Cancelar fatura"
          rotuloDeCancelar="Voltar"
          reversivel
          confirmando={cancelar.isPending}
          onConfirmar={() => cancelar.mutate()}
          onFechar={() => setConfirmandoCancelamento(false)}
        />
      )}
    </Box>
  );
}
