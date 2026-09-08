import { Box, Checkbox, Flex, Table, Text } from "@chakra-ui/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  CartaoDeTabela,
  Modal,
  RodapeDeFormulario,
  SeletorData,
  Tabela,
} from "../../../../components";
import { NATUREZA_SAIDA } from "../../../../constants";
import { useToast } from "../../../../contexts/ToastContext";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { emitirFatura } from "../../../../services";
import { ApiError } from "../../../../services/api/client";
import { invalidarCatalogoFinanceiro } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar, formatarCentavos, formatarData, hojeISO } from "../../../../utils";
import { COLUNAS_DA_EMISSAO } from "../../constants";
import type { ModalDeEmissaoProps } from "./types";

/** Emitir a fatura de um cliente.
 *
 * 🔴 **O total é recalculado ao desmarcar**, e não é enfeite: a fatura é um
 * documento que o cliente recebe, e o número dela tem de ser o do que
 * entrou. Quem emite decide o que fica de fora desta vez.
 *
 * 🔴 **A DESPESA não é linha de cobrança.** Ela vira um recebível de
 * reembolso no valor dela, e a despesa em si é carimbada como cobrada. Por
 * isso a linha diz "reembolso" -- somá-la como se o cliente devesse a
 * despesa faria o total do documento não bater com o que ele paga.
 *
 * ⚠️ **Zero marcadas desabilita o botão.** Uma fatura vazia não é documento;
 * deixar emitir e receber 400 seria empurrar para o servidor uma pergunta
 * que a tela já sabe responder.
 *
 * ⚠️ **O NÚMERO não aparece aqui.** O artefato mostra um campo com
 * "2026-0008" travado, mas ele é sequencial do escritório e só existe DEPOIS
 * da emissão -- mostrar um palpite seria prometer um número que pode sair
 * outro se alguém emitir junto.
 *
 * ⚠️ **Uma divergência do artefato, de 3px:** ele dá à prévia um padding
 * menor (`.previa-fatura td{padding:10px 14px}`) que o das outras tabelas.
 * Aqui vale a régua do projeto -- toda `Table.Cell` declara `13px 14px`, e
 * há um guarda mecânico cobrando. Três pixels não pagam uma exceção numa
 * régua que existe para as linhas terem a mesma altura em toda tela.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ModalDeEmissao({ cliente, onFechar, onEmitida }: ModalDeEmissaoProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  /* Todos marcados ao abrir: o caminho comum é cobrar tudo que está lá. */
  const [marcados, setMarcados] = useState<string[]>(
    () => cliente.lancamentos.map((l) => l.lancamento_id),
  );
  const [vencimento, setVencimento] = useState(hojeISO());
  const [erro, setErro] = useState("");

  const escolhidos = cliente.lancamentos.filter((l) => marcados.includes(l.lancamento_id));
  const total = escolhidos.reduce((soma, l) => soma + l.valor_centavos, 0);
  const semNada = escolhidos.length === 0;

  const { mudou } = useGuardaDeDescarte({
    marcados: marcados.join(","),
    vencimento: vencimento === hojeISO() ? "" : vencimento,
  });

  const emitir = useMutation({
    mutationFn: () =>
      emitirFatura({
        cliente_id: cliente.cliente_id,
        lancamento_ids: marcados,
        data_vencimento: vencimento,
      }) as Promise<{ fatura_id: string; numero: string }>,
    onSuccess: (resposta) => {
      /* 🔴 Derruba as faturas E os lançamentos: a emissão carimba cada
         lançamento com `fatura_id` e cria o recebível do reembolso -- a
         lista de lançamentos muda junto. */
      queryClient.invalidateQueries({ queryKey: qk.aFaturar() });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
      invalidarCatalogoFinanceiro(queryClient);
      toast.sucesso(`Fatura ${resposta.numero} emitida.`);
      onEmitida(resposta.fatura_id);
    },
    onError: (err) =>
      setErro(err instanceof ApiError ? err.message : "Não foi possível emitir a fatura."),
  });

  function alternar(lancamentoId: string) {
    setMarcados((atuais) =>
      atuais.includes(lancamentoId)
        ? atuais.filter((i) => i !== lancamentoId)
        : [...atuais, lancamentoId],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (semNada) return;
    emitir.mutate();
  }

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo={`Emitir fatura · ${cliente.cliente_nome}`}
      largo
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={emitir.isPending}>
          <Botao type="submit" form="form-da-fatura" disabled={semNada || emitir.isPending}>
            {emitir.isPending ? "Emitindo…" : "Emitir fatura"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-da-fatura" onSubmit={handleSubmit}>
        <Text fontSize="13px" color="fg.subtle" mb="14px">
          A fatura junta os lançamentos abaixo num documento só, com número
          sequencial do escritório. Desmarque o que não entra desta vez.
        </Text>

        <CartaoDeTabela>
          <Tabela colunas={COLUNAS_DA_EMISSAO}>
            {cliente.lancamentos.map((l) => {
              const eDespesa = l.natureza === NATUREZA_SAIDA;
              return (
                <Table.Row key={l.lancamento_id}>
                  <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                    <Checkbox.Root
                      checked={marcados.includes(l.lancamento_id)}
                      onCheckedChange={() => alternar(l.lancamento_id)}
                      aria-label={`Incluir ${l.descricao}`}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>
                  <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                    <Text fontSize="13px" fontWeight="700">{l.descricao}</Text>
                    {/* ⚠️ A despesa se anuncia: ela não é cobrança, é
                        reembolso -- e o total soma o valor dela do mesmo
                        jeito, porque é isso que o cliente devolve. */}
                    {eDespesa && (
                      <Text fontSize="12px" color="fg.subtle">
                        Despesa adiantada · entra como reembolso
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                    <Text fontSize="12.5px" fontFamily="mono" whiteSpace="nowrap">
                      {formatarData(l.data_vencimento)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell p="13px 14px" textAlign="right" borderBottomWidth="1px" borderBottomColor="border.subtle">
                    <Text fontSize="13px" fontFamily="mono" whiteSpace="nowrap">
                      R$ {formatarCentavos(l.valor_centavos)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Tabela>

          <Flex justify="space-between" align="center" p="12px 14px" borderTopWidth="1px" borderTopColor="border">
            <Text fontSize="13px" fontWeight="700">
              Total da fatura
              <Text as="span" color="fg.subtle" fontWeight="400" ml="8px">
                {contar(escolhidos.length, "lançamento", "lançamentos")}
              </Text>
            </Text>
            <Text fontSize="14px" fontWeight="800" fontFamily="mono">
              R$ {formatarCentavos(total)}
            </Text>
          </Flex>
        </CartaoDeTabela>

        <Box mt="16px" maxW="320px">
          <Campo rotulo="Vencimento da fatura" para="fat-vencimento" obrigatorio>
            <SeletorData
              id="fat-vencimento"
              rotuladoPor="fat-vencimento-rotulo"
              valor={vencimento}
              onMudar={setVencimento}
            />
          </Campo>
        </Box>

        {erro && (
          <Text mt="6px" fontSize="12px" color="status.bad">
            {erro}
          </Text>
        )}
      </form>
    </Modal>
  );
}
