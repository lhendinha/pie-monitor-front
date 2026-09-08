import { Box, Text } from "@chakra-ui/react";
import type { FormEvent } from "react";
import { useState } from "react";

import {
  Botao,
  Campo,
  LinhaDeCampos,
  Modal,
  RodapeDeFormulario,
  Select,
  SeletorData,
} from "../../../../components";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { formatarCentavos, hojeISO } from "../../../../utils";
import type { ModalDePagamentoProps } from "./types";

/** Registrar o pagamento de uma fatura: quando entrou, e onde.
 *
 * 🔴 **Pagar é o documento INTEIRO** -- não há valor parcial, e mandar um é
 * 422 do lado de lá. Quem recebeu parte dá baixa em cada lançamento pela
 * lista, e a fatura fecha sozinha quando o último abrir fechar.
 *
 * 🔴 **A conta é UMA.** Um pagamento de fatura é um depósito só; sem
 * escolher, cada linha vai para a conta que previa, o total fica certo e
 * cada conta para de bater com o extrato. Por isso ela é o padrão da tela e
 * não uma opção escondida.
 *
 * ⚠️ **A data não pode ser no futuro**, e a recusa é do servidor. A tela
 * também não deixa: viajar para pedir um 400 é gastar uma ida à toa.
 *
 * ➡️ `../../index.test.tsx`.
 */
export default function ModalDePagamento({
  numero, valorCentavos, opcoesDeConta, erro, salvando, onConfirmar, onFechar,
}: ModalDePagamentoProps) {
  const [pagoEm, setPagoEm] = useState(hojeISO());
  const [contaId, setContaId] = useState("");
  const [tentou, setTentou] = useState(false);

  const noFuturo = pagoEm > hojeISO();
  const { mudou } = useGuardaDeDescarte({
    pagoEm: pagoEm === hojeISO() ? "" : pagoEm,
    contaId,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (!pagoEm || noFuturo) return;
    onConfirmar({ pago_em: pagoEm, conta_id: contaId });
  }

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo={`Registrar pagamento · ${numero}`}
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao type="submit" form="form-do-pagamento" disabled={salvando}>
            {salvando ? "Registrando…" : "Registrar pagamento"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-do-pagamento" onSubmit={handleSubmit}>
        <Text fontSize="13px" color="fg.subtle" mb="14px">
          Isto dá baixa em todas as linhas ainda abertas da fatura, no valor de{" "}
          <Text as="span" fontWeight="700" fontFamily="mono">
            R$ {formatarCentavos(valorCentavos)}
          </Text>
          .
        </Text>

        <LinhaDeCampos>
          <Campo
            rotulo="Recebido em"
            para="fat-pago-em"
            obrigatorio
            erro={
              tentou && !pagoEm
                ? "Informe a data do recebimento."
                : noFuturo
                  ? "A data não pode ser no futuro."
                  : undefined
            }
          >
            <SeletorData
              id="fat-pago-em"
              rotuladoPor="fat-pago-em-rotulo"
              valor={pagoEm}
              onMudar={setPagoEm}
            />
          </Campo>
          {/* ⚠️ Opcional de propósito: vazia, cada linha vai para a conta que
              previa -- que é o certo quando todas preveem a mesma. */}
          <Campo
            rotulo="Conta do recebimento"
            para="fat-conta"
            dica="Vazia: cada linha vai para a conta que já previa."
          >
            <Select
              id="fat-conta"
              opcoes={opcoesDeConta}
              valor={contaId}
              onMudar={setContaId}
              placeholder="A conta de cada linha"
            />
          </Campo>
        </LinhaDeCampos>

        {erro && (
          <Box mt="6px">
            <Text fontSize="12px" color="status.bad">{erro}</Text>
          </Box>
        )}
      </form>
    </Modal>
  );
}
