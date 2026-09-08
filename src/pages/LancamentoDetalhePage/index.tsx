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
  Etiqueta,
  EtiquetaDeMetadado,
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
import { useVoltarParaLista } from "../../hooks/useVoltarParaLista";
import {
  atualizarLancamento,
  detalheCliente,
  detalheLancamento,
  efetivarLancamento,
  excluirLancamento,
  lerCatalogoFinanceiro,
  papelAtende,
  reabrirLancamento,
} from "../../services";
import { ApiError } from "../../services/api/client";
import { invalidarCatalogoFinanceiro, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { coresDaSituacao } from "../../theme/lancamento";
import { ROTULO_DA_SITUACAO } from "../FinanceiroPage/constants";
import type { CatalogoFinanceiro, Cliente, EscopoDaSerie, Lancamento } from "../../types";
import type { CamposDoLancamento } from "../../types/requisicoes";
import FormularioDoLancamento from "./components/FormularioDoLancamento";

/** A tela de um lançamento: o que ele é, o que dá para corrigir nele, e as
 * duas ações que mexem em dinheiro.
 *
 * É ROTA, e não modal, pela mesma razão do detalhe de documento: precisa
 * aguentar um F5 e um link colado -- a Área de trabalho aponta para cá.
 *
 * 🔴 **Dar baixa e excluir vivem AQUI, e não na linha da lista.** As duas
 * mexem no saldo de uma conta, e um clique de raspão numa tabela de vinte
 * linhas é barato demais para isso.
 *
 * 🔴 **Cada botão só aparece quando o servidor aceitaria** -- as três regras
 * foram lidas em `efetivacao_service`, não supostas: transferência não
 * efetiva nem reabre (400); lançamento em fatura não reabre nem se exclui
 * (409); excluir é `admin`+. O subtítulo diz o motivo no lugar do botão que
 * não veio.
 *
 * ⚠️ **Sem as abas "Detalhes | Fatura" do artefato**: a segunda mostra a
 * fatura do lançamento, que é a Fase 6. Uma aba sozinha não é aba, e uma
 * segunda aba vazia repetiria o erro que a aba Lançamentos já cometeu.
 *
 * ➡️ `index.test.tsx`.
 */
export default function LancamentoDetalhePage() {
  const { lancamentoId = "" } = useParams();
  /* ⚠️ Volta no HISTÓRICO -- é o que preserva os filtros e a página da lista
     de onde a pessoa veio. Ver `useVoltarParaLista`. */
  const voltar = useVoltarParaLista("/financeiro?aba=lancamentos");
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [confirmandoSalvar, setConfirmandoSalvar] = useState<CamposDoLancamento | null>(null);
  const [escopo, setEscopo] = useState<EscopoDaSerie>("este");
  const [erroDoFormulario, setErroDoFormulario] = useState("");

  const query = useQuery<Lancamento>({
    queryKey: qk.lancamento(lancamentoId),
    queryFn: () => detalheLancamento(lancamentoId),
    enabled: Boolean(lancamentoId),
    /* ⚠️ Link velho aponta para lançamento excluído: retentar um 404 três
       vezes só atrasa o recado. */
    retry: false,
  });

  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });

  const clienteId = query.data?.cliente_id ?? "";
  /* ⚠️ Pelo ID, e não pela busca: `listarClientes({busca})` procura no NOME,
     e o lançamento guarda só o id -- a busca por um id devolveria vazio e o
     campo mostraria o id cru.
     ⚠️ Só quando HÁ cliente: a maioria dos lançamentos tem contraparte em
     texto, e uma consulta por tela para nada é uma consulta a mais. */
  const cliente = useQuery<Cliente>({
    queryKey: qk.detalheCliente(clienteId),
    queryFn: () => detalheCliente(clienteId) as Promise<Cliente>,
    enabled: Boolean(clienteId),
    retry: false,
  });

  /** 🔴 Derruba as LISTAS e o catálogo junto: dar baixa move o saldo da
   * conta, e o saldo aparece na aba Configurações e nos cartões de totais.
   * Invalidar só o detalhe deixaria o número velho nas outras telas. */
  function invalidarDinheiro() {
    queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    invalidarCatalogoFinanceiro(queryClient);
  }

  function releEEspalha() {
    queryClient.invalidateQueries({ queryKey: qk.lancamento(lancamentoId) });
    invalidarDinheiro();
  }

  const salvar = useMutation({
    mutationFn: (v: { campos: CamposDoLancamento; escopo: EscopoDaSerie }) =>
      atualizarLancamento(lancamentoId, v.campos, v.escopo),
    onSuccess: () => {
      releEEspalha();
      setErroDoFormulario("");
      setConfirmandoSalvar(null);
      toast.sucesso("Lançamento salvo.");
    },
    /* A recusa vai para o FORMULÁRIO: ela fala de um campo que está na tela
       ("Conta desativada: escolha outra"), e um toast leva o recado embora
       antes de a pessoa achar o campo. */
    onError: (err) => {
      setConfirmandoSalvar(null);
      setErroDoFormulario(
        err instanceof ApiError ? err.message : "Não foi possível salvar o lançamento.",
      );
    },
  });

  const efetivar = useMutation({
    mutationFn: () => efetivarLancamento(lancamentoId),
    onSuccess: () => {
      releEEspalha();
      toast.sucesso("Baixa registrada.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível registrar a baixa."),
  });

  const reabrir = useMutation({
    mutationFn: () => reabrirLancamento(lancamentoId),
    onSuccess: () => {
      releEEspalha();
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
         que a tela mostrava. */
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

  /** O motivo de a tela não oferecer o que a pessoa espera. Vazio quando não
   * há motivo -- e aí o subtítulo não aparece. */
  const impedimento = emFatura
    ? "Está numa fatura: cancele a fatura antes de desfazer a baixa ou excluir."
    : eTransferencia
      ? "Transferência já nasce efetivada; para corrigir, exclua e refaça."
      : "";

  /** 🔴 A pergunta do Google Agenda ao SALVAR, e só numa série: sem irmãos o
   * servidor ignora o escopo, e perguntar pediria uma decisão que não muda
   * nada. Num avulso, salva direto. */
  function pedirParaSalvar(campos: CamposDoLancamento) {
    setErroDoFormulario("");
    if (Object.keys(campos).length === 0) {
      toast.sucesso("Nada mudou.");
      return;
    }
    if (naSerie) {
      setEscopo("este");
      setConfirmandoSalvar(campos);
      return;
    }
    salvar.mutate({ campos, escopo: "este" });
  }

  return (
    <Box>
      {cabecalhoDeVolta}

      <CabecalhoDePagina
        titulo={lancamento.descricao}
        subtitulo={impedimento || undefined}
        acoes={
          <Flex gap="8px" wrap="wrap">
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
            {podeDarBaixa && (
              <Botao
                variante="ghost"
                onClick={() => efetivar.mutate()}
                disabled={efetivar.isPending}
              >
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
            <Botao type="submit" form="form-do-lancamento" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Botao>
          </Flex>
        }
      />

      <Flex gap="6px" wrap="wrap" mb="14px">
        <Etiqueta cores={coresDaSituacao(lancamento.situacao)}>
          {ROTULO_DA_SITUACAO[lancamento.situacao] ?? lancamento.situacao}
        </Etiqueta>
        {lancamento.parcela && (
          <EtiquetaDeMetadado>Parcela {lancamento.parcela}</EtiquetaDeMetadado>
        )}
        {naSerie && <EtiquetaDeMetadado>Faz parte de uma série</EtiquetaDeMetadado>}
      </Flex>

      <CartaoDeTabela>
        <FormularioDoLancamento
          lancamento={lancamento}
          catalogo={catalogo.data}
          nomeDoCliente={cliente.data?.nome ?? ""}
          erro={erroDoFormulario}
          onSalvar={pedirParaSalvar}
        />
      </CartaoDeTabela>

      {confirmandoSalvar && (
        <ModalDeConfirmacao
          titulo="Salvar alteração"
          /* Reversível: editar não destrói nada, e a lixeira com o "não pode
             ser desfeita" assustaria à toa. */
          reversivel
          rotulo="Salvar"
          mensagem="Este lançamento faz parte de uma série. Até onde a alteração vai?"
          escolha={
            <Box>
              <OpcaoDeLinha ativa={escopo === "este"} onClick={() => setEscopo("este")}>
                Somente este
              </OpcaoDeLinha>
              <OpcaoDeLinha ativa={escopo === "futuros"} onClick={() => setEscopo("futuros")}>
                Este e os próximos em aberto
              </OpcaoDeLinha>
            </Box>
          }
          confirmando={salvar.isPending}
          onConfirmar={() => salvar.mutate({ campos: confirmandoSalvar, escopo })}
          onFechar={() => setConfirmandoSalvar(null)}
        />
      )}

      {confirmandoExclusao && (
        <ModalDeConfirmacao
          titulo="Excluir lançamento"
          mensagem={
            <>
              O lançamento <strong>{lancamento.descricao}</strong> será removido.
            </>
          }
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
          /* 🔴 O aviso fala do DINHEIRO: num efetivado, excluir devolve o
             valor ao saldo da conta -- e quem confirma precisa saber disso
             antes, não depois de estranhar o extrato. */
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
