import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../../contexts/ToastContext";
import {
  criarEntrada,
  criarHonorario,
  criarSaida,
  criarTransferencia,
} from "../../../services";
import { ApiError } from "../../../services/api/client";
import { invalidarCatalogoFinanceiro } from "../../../services/queryClient";
import type { DadosDaTransferencia, DadosDoLancamento } from "../../../types/requisicoes";
import type { FormaDeLancamento } from "../types";

/** Qual formulário está aberto, e o que acontece quando ele salva.
 *
 * 🔴 **Derruba as listas E o catálogo.** Um lançamento que nasce efetivado
 * move o saldo da conta no mesmo ato, e o saldo aparece na aba Configurações
 * e nos cartões de totais -- invalidar só a lista deixaria o número velho
 * onde ele importa.
 *
 * 🔴 **A recusa do servidor vai para o FORMULÁRIO, não para um toast.** Ela
 * fala de um campo que está na tela ("Conta desativada: escolha outra",
 * "Informe o cliente OU o nome de quem pagou/recebeu"), e um toast que some
 * em cinco segundos leva o recado embora antes de a pessoa achar o campo.
 *
 * ⚠️ **"Salvar e adicionar outra" REMONTA o formulário** (`chave` muda), em
 * vez de zerar campo por campo. Zerar à mão esquece um -- e o campo
 * esquecido aqui seria a `chave_de_criacao`, que é justamente o que impede o
 * segundo lançamento de ser recusado como repetição do primeiro.
 *
 * ➡️ `../index.test.tsx`.
 */
export function useCriarLancamento() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [forma, setForma] = useState<FormaDeLancamento | null>(null);
  const [erro, setErro] = useState("");
  const [chave, setChave] = useState(0);

  function abrir(nova: FormaDeLancamento) {
    setErro("");
    setForma(nova);
  }

  function fechar() {
    setErro("");
    setForma(null);
  }

  function aoGravar(continuar: boolean) {
    queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    invalidarCatalogoFinanceiro(queryClient);
    toast.sucesso("Lançamento cadastrado.");
    setErro("");
    if (continuar) setChave((c) => c + 1);
    else setForma(null);
  }

  function aoFalhar(err: unknown) {
    setErro(err instanceof ApiError ? err.message : "Não foi possível salvar o lançamento.");
  }

  const honorario = useMutation({
    mutationFn: (v: { dados: DadosDoLancamento; parcelas: number; continuar: boolean }) =>
      criarHonorario(v.dados, v.parcelas),
    onSuccess: (_r, v) => aoGravar(v.continuar),
    onError: aoFalhar,
  });

  const entrada = useMutation({
    mutationFn: (v: { dados: DadosDoLancamento; repetir: boolean; continuar: boolean }) =>
      criarEntrada(v.dados, v.repetir),
    onSuccess: (_r, v) => aoGravar(v.continuar),
    onError: aoFalhar,
  });

  const saida = useMutation({
    mutationFn: (v: { dados: DadosDoLancamento; repetir: boolean; continuar: boolean }) =>
      criarSaida(v.dados, v.repetir),
    onSuccess: (_r, v) => aoGravar(v.continuar),
    onError: aoFalhar,
  });

  const transferencia = useMutation({
    mutationFn: (v: { dados: DadosDaTransferencia; continuar: boolean }) =>
      criarTransferencia(v.dados),
    onSuccess: (_r, v) => aoGravar(v.continuar),
    onError: aoFalhar,
  });

  return {
    forma, abrir, fechar, erro, chave,
    salvando:
      honorario.isPending || entrada.isPending || saida.isPending || transferencia.isPending,
    honorario, entrada, saida, transferencia,
  };
}
