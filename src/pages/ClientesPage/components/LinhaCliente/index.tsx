import { Table, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import { mascararCpfCnpj, mascararTelefone } from "../../../../utils";
import type { LinhaClienteProps } from "./types";

/** Pessoa física ou jurídica, pelo tamanho do documento -- 11 dígitos é
 * CPF, 14 é CNPJ. Sem documento não dá pra afirmar nem uma coisa nem
 * outra, então não afirma. */
function tipoDoCliente(cpfCnpj?: string | null): string {
  const digitos = (cpfCnpj || "").replace(/\D/g, "");
  if (digitos.length === 11) return "Pessoa física";
  if (digitos.length === 14) return "Pessoa jurídica";
  return "";
}

/** Uma linha da tabela de clientes.
 *
 * A linha inteira leva ao detalhe (`/clientes/{id}`), e precisa ser
 * alcançável pelo teclado: as ações saíram da linha e foram pro detalhe,
 * então quem navega por Tab não teria outro caminho.
 */
export default function LinhaCliente({ cliente }: LinhaClienteProps) {
  const navegar = useNavigate();
  const tipo = tipoDoCliente(cliente.cpf_cnpj);

  function abrir() {
    navegar(`/clientes/${cliente.cliente_id}`);
  }

  return (
    <Table.Row
      tabIndex={0}
      cursor="pointer"
      _hover={{ bg: "bg.canvas" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "-2px" }}
      _last={{ "& td": { borderBottomWidth: 0 } }}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir();
        }
      }}
    >
      <Table.Cell verticalAlign="top" p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Text fontSize="13px" fontWeight="700">
          {cliente.nome}
        </Text>
        {tipo && (
          <Text fontSize="12px" color="fg.subtle" mt="2px">
            {tipo}
          </Text>
        )}
      </Table.Cell>
      <Table.Cell
        verticalAlign="top"
        p="13px 14px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        fontFamily="mono"
        fontSize="12.5px"
      >
        {mascararCpfCnpj(cliente.cpf_cnpj || "") || "—"}
      </Table.Cell>
      <Table.Cell verticalAlign="top" p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Text fontSize="13px">{mascararTelefone(cliente.telefone || "") || "—"}</Text>
        {cliente.email && (
          <Text fontSize="12px" color="fg.subtle" mt="2px">
            {cliente.email}
          </Text>
        )}
      </Table.Cell>
      <Table.Cell
        verticalAlign="top"
        p="13px 14px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        className="num"
        fontSize="13px"
      >
        {cliente.processos ?? 0}
      </Table.Cell>
    </Table.Row>
  );
}
