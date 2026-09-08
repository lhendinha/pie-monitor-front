import { Flex, Table, Text } from "@chakra-ui/react";

import { NATUREZA_ENTRADA } from "../../../../../constants";
import { formatarCentavos } from "../../../../../utils";
import { ehPrevisao } from "../legendaDoFluxo";
import Celula from "./Celula";
import FaixaDaSecao from "./FaixaDaSecao";
import type { SecaoDoFluxoProps } from "./types";

/** Uma seção da tabela -- Entradas ou Saídas: a faixa, as categorias e o
 * total.
 *
 * 🔴 **O total vem DEPOIS das categorias**, como no artefato e como se lê
 * uma coluna de números: primeiro as parcelas, depois a soma. Eu tinha
 * posto os números na própria faixa, o que colocava o total antes do que ele
 * soma.
 *
 * 🔴 **É a seção que dobra**, e não a categoria agrupadora: o servidor
 * entrega "por categoria (agrupador somando as filhas)" -- medido,
 * `Impostos` vem com o total do DAS e as filhas não são linha nenhuma. Não
 * há o que esconder abaixo de uma categoria; há abaixo de ENTRADAS e de
 * SAÍDAS. Dobrar esconde as categorias e MANTÉM o total, que é por onde se
 * lê o mês.
 */
export default function SecaoDoFluxo({
  natureza, rotulo, rotuloDoTotal, linhas, meses, totalPorMes,
  mesCorrente, dobrada, onAlternar,
}: SecaoDoFluxoProps) {
  const eEntrada = natureza === NATUREZA_ENTRADA;
  const tom = eEntrada ? "status.good" : "status.bad";
  const totalDaSecao = meses.reduce((soma, m) => soma + (totalPorMes[m] ?? 0), 0);

  return (
    <>
      <FaixaDaSecao
        rotulo={rotulo}
        natureza={natureza}
        quantasColunas={meses.length + 2}
        fundo={`${tom}.bg`}
        cor={`${tom}.text`}
        dobrada={dobrada}
        onAlternar={onAlternar}
      />

      {!dobrada && linhas.map((linha) => (
        <Table.Row key={linha.categoria_id}>
          <Celula fixa>
            <Flex align="center" gap="10px" pl="10px">
              {/* O quadradinho de cor da categoria, como no artefato -- e a
                  mesma cor que a lista de lançamentos usa. Categoria sem cor
                  (apagada do catálogo) não desenha nada. */}
              {linha.cor && (
                <Text
                  as="span" w="10px" h="10px" borderRadius="3px" flexShrink="0"
                  css={{ background: linha.cor }}
                />
              )}
              <Text as="span" fontSize="13px">{linha.nome}</Text>
            </Flex>
          </Celula>
          {meses.map((mes) => (
            <Celula key={mes} aDireita previsao={ehPrevisao(mes, mesCorrente)}>
              R$ {formatarCentavos(linha.por_mes[mes] ?? 0)}
            </Celula>
          ))}
          <Celula aDireita forte>R$ {formatarCentavos(linha.total_centavos)}</Celula>
        </Table.Row>
      ))}

      <Table.Row>
        <Celula fixa forte cor={`${tom}.text`}>{rotuloDoTotal}</Celula>
        {meses.map((mes) => (
          <Celula
            key={mes}
            aDireita
            forte
            cor={`${tom}.text`}
            previsao={ehPrevisao(mes, mesCorrente)}
          >
            R$ {formatarCentavos(totalPorMes[mes] ?? 0)}
          </Celula>
        ))}
        <Celula aDireita forte cor={`${tom}.text`}>
          R$ {formatarCentavos(totalDaSecao)}
        </Celula>
      </Table.Row>
    </>
  );
}
