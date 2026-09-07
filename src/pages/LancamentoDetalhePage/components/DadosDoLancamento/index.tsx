import { Flex, SimpleGrid, Text } from "@chakra-ui/react";

import { CampoDeLeitura, Etiqueta } from "../../../../components";
import { NATUREZA_ENTRADA } from "../../../../constants";
import { coresDaSituacao, corDoValor, sinalDoValor } from "../../../../theme/lancamento";
import { formatarCentavos, formatarData } from "../../../../utils";
import { ROTULO_DA_SITUACAO } from "../../../FinanceiroPage/constants";
import type { DadosDoLancamentoProps } from "./types";

/** O que o lançamento é, em leitura.
 *
 * ⚠️ **O rótulo da data de efetivação muda com a natureza**: "Recebida" numa
 * entrada, "Paga" numa saída. É a mesma data no banco, e a palavra errada
 * faria a tela de uma despesa dizer que alguém recebeu.
 *
 * 🔴 **O rateio aparece quando tem mais de uma linha.** Com um departamento
 * só ele é o próprio lançamento, e listá-lo repetiria o valor logo abaixo
 * dele mesmo -- ruído no lugar de informação.
 *
 * ➡️ `pages/LancamentoDetalhePage/index.test.tsx`.
 */
export default function DadosDoLancamento({
  lancamento: l, catalogo, nomeDoDepartamento,
}: DadosDoLancamentoProps) {
  const categoria = catalogo?.categorias.find((c) => c.categoria_id === l.categoria_id);
  const conta = catalogo?.contas.find((c) => c.conta_id === l.conta_id);
  const centro = catalogo?.centros_de_custo.find((c) => c.centro_id === l.centro_id);
  const rotuloDaEfetivacao = l.natureza === NATUREZA_ENTRADA ? "Recebida em" : "Paga em";

  return (
    <>
      <Flex align="center" gap="10px" wrap="wrap" mb="14px">
        <Text
          fontSize="25px"
          fontWeight="800"
          letterSpacing="-0.02em"
          fontFamily="mono"
          color={corDoValor(l.natureza)}
        >
          {sinalDoValor(l.natureza)} R$ {formatarCentavos(l.valor_centavos)}
        </Text>
        <Etiqueta cores={coresDaSituacao(l.situacao)}>
          {ROTULO_DA_SITUACAO[l.situacao] ?? l.situacao}
        </Etiqueta>
        {l.parcela && (
          <Text fontSize="12px" color="fg.muted">Parcela {l.parcela}</Text>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="12px">
        <CampoDeLeitura rotulo="Descrição">{l.descricao}</CampoDeLeitura>
        <CampoDeLeitura rotulo="Vencimento">{formatarData(l.data_vencimento)}</CampoDeLeitura>
        <CampoDeLeitura rotulo="Categoria">{categoria?.nome ?? ""}</CampoDeLeitura>
        <CampoDeLeitura rotulo="Conta">{conta?.nome ?? ""}</CampoDeLeitura>
        {/* ⚠️ Só aparece quando existe: o centro de custo é opcional, e um
            campo vazio na tela sugere que alguém esqueceu de preencher. */}
        {l.centro_id && <CampoDeLeitura rotulo="Centro de custo">{centro?.nome ?? ""}</CampoDeLeitura>}
        <CampoDeLeitura rotulo="Contraparte">{l.contraparte}</CampoDeLeitura>
        {l.data_efetivacao && (
          <CampoDeLeitura rotulo={rotuloDaEfetivacao}>{formatarData(l.data_efetivacao)}</CampoDeLeitura>
        )}
        {l.documento_numero && (
          <CampoDeLeitura rotulo="Documento">{l.documento_numero}</CampoDeLeitura>
        )}
      </SimpleGrid>

      {l.rateio.length > 1 && (
        <>
          <Text fontSize="12.5px" fontWeight="700" mt="16px" mb="6px">
            Dividido entre departamentos
          </Text>
          {l.rateio.map((p) => (
            <Flex key={p.subgrupo_id} justify="space-between" py="4px" maxW="360px">
              <Text fontSize="13px">{nomeDoDepartamento(p.subgrupo_id)}</Text>
              <Text fontSize="13px" fontWeight="700" fontFamily="mono">
                R$ {formatarCentavos(p.valor_centavos)}
              </Text>
            </Flex>
          ))}
        </>
      )}
    </>
  );
}
