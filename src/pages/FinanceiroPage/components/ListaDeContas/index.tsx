import { Box, Flex, Stack, Text } from "@chakra-ui/react";

import { Botao, CartaoDeTabela, Etiqueta } from "../../../../components";
import { contar, formatarCentavos, formatarData } from "../../../../utils";

import LinhaDoCatalogo from "../LinhaDoCatalogo";
import SubcabecalhoDaLista from "../SubcabecalhoDaLista";
import type { ListaDeContasProps } from "./types";

/** ⚠️ Azul da marca, e não verde: verde já significa "entrada" no
 * Financeiro, e a conta padrão não é uma entrada -- é uma escolha. */
const CORES_DA_PADRAO = { bg: "bg.brand.subtle", color: "brand.darker" };

/** Onde o dinheiro do escritório está.
 *
 * ⚠️ O saldo mostrado é o GRAVADO, mantido pela API a cada baixa -- não é
 * somado aqui. Somar a história a cada leitura seria ilimitado, e o número
 * da tela tem de ser o mesmo que a API move.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeContas({
  contas,
  contaPadraoId,
  podeEscrever,
  onNova,
  onEditar,
  onAlternarAtivo,
}: ListaDeContasProps) {
  return (
    <>
      <SubcabecalhoDaLista
        titulo="Contas"
        contagem={`Mostrando ${contas.length} de ${contar(contas.length, "conta", "contas")}`}
        acao={podeEscrever ? <Botao onClick={onNova}>+ Nova conta</Botao> : undefined}
      />
      <CartaoDeTabela>
      {contas.map((conta) => (
        <LinhaDoCatalogo
          key={conta.conta_id}
          nome={conta.nome}
          ativo={conta.ativa}
          detalhe={
            <Flex align="center" gap="8px" minW="0">
              <Text as="span" truncate>
                {detalheDaConta(conta)}
              </Text>
              {conta.conta_id === contaPadraoId && (
                <Box flexShrink="0" title="Escolhida em Grupo › Configurações">
                  <Etiqueta cores={CORES_DA_PADRAO}>Padrão</Etiqueta>
                </Box>
              )}
            </Flex>
          }
          direita={
            <Stack align="flex-end" gap="0" mr="8px">
              <Text fontSize="13px" fontWeight="700" color="text.strong">
                R$ {formatarCentavos(conta.saldo_centavos)}
              </Text>
              <Text fontSize="11px" color="text.muted">
                Saldo atual
              </Text>
            </Stack>
          }
          onEditar={podeEscrever ? () => onEditar(conta) : undefined}
          onAlternarAtivo={podeEscrever ? () => onAlternarAtivo(conta) : undefined}
        />
      ))}
      </CartaoDeTabela>
    </>
  );
}

/** Banco, agência e conta quando há; senão o tipo. Sempre com a data desde
 * quando o saldo é acompanhado -- é ela que explica um saldo inicial que não
 * bate com o extrato de hoje. */
function detalheDaConta(conta: ListaDeContasProps["contas"][number]) {
  const partes = conta.banco
    ? [
        `Banco ${conta.banco}`,
        conta.agencia && `Ag. ${conta.agencia}`,
        conta.numero && `C/C ${conta.numero}`,
      ]
    : ["dinheiro em espécie"];
  const vivas = partes.filter(Boolean);
  const desde = conta.inicio ? `desde ${formatarData(conta.inicio)}` : "";
  return [...vivas, desde, conta.ativa ? "" : "(Inativa)"].filter(Boolean).join(" · ");
}
