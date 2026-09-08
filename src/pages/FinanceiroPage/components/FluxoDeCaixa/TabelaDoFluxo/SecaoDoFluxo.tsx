import { Flex, Table, Text } from "@chakra-ui/react";

import { BotaoNu, IconeChevron, Ponto } from "../../../../../components";
import { NATUREZA_ENTRADA } from "../../../../../constants";
import { formatarCentavos } from "../../../../../utils";
import Celula from "./Celula";
import type { SecaoDoFluxoProps } from "./types";

/** Uma seção da tabela -- Entradas ou Saídas -- com as categorias dela e o
 * total.
 *
 * 🔴 **É esta que dobra**, e não a categoria agrupadora: o servidor entrega
 * "por categoria (agrupador somando as filhas)", medido -- `Impostos` vem
 * com o total do DAS e as filhas não são linha nenhuma. Não há o que
 * esconder abaixo de uma categoria; há abaixo de ENTRADAS e de SAÍDAS.
 *
 * 🔴 **Dobrar esconde as categorias e MANTÉM o total**: a linha de total é
 * por onde se lê o mês, e escondê-la junto transformaria a tabela dobrada
 * numa tabela vazia.
 *
 * ⚠️ **O realizado aparece embaixo do previsto quando eles diferem.** A
 * resposta separa os dois de propósito: num mês passado, o previsto que não
 * aconteceu está na coluna e não está no saldo, e sem dizer isso a tabela
 * mentiria de outro jeito.
 */
export default function SecaoDoFluxo({
  natureza, rotulo, linhas, meses, totalPorMes, realizadoPorMes,
  mesCorrente, dobrada, onAlternar,
}: SecaoDoFluxoProps) {
  const totalDaSecao = meses.reduce((soma, m) => soma + (totalPorMes[m] ?? 0), 0);

  return (
    <>
      <Table.Row bg="bg.canvas">
        <Celula fixa forte fundo="bg.canvas">
          {/* ⚠️ `BotaoNu` e não a linha inteira clicável: a linha tem 25
              células, e um clique de raspão em qualquer uma delas dobraria a
              seção sem a pessoa ter pedido. */}
          <BotaoNu
            type="button"
            onClick={() => onAlternar(natureza)}
            aria-expanded={!dobrada}
            display="flex"
            alignItems="center"
            gap="8px"
            fontWeight="800"
            fontSize="13px"
          >
            {/* 🔴 O `IconeChevron` do projeto, e a régua dele é GIRAR: é o
                mesmo gesto do select (`SetaDoSelect`), onde aberto é a seta
                para baixo e fechado é a seta na posição de repouso. Eu tinha
                posto `▶`/`▼` em texto -- dois glifos diferentes, na fonte do
                sistema, que não são o traço 2 do artefato e mudam de
                desenho conforme a plataforma. */}
            <Flex
              as="span"
              color="fg.subtle"
              transition="transform .15s"
              transform={dobrada ? "rotate(-90deg)" : undefined}
            >
              <IconeChevron tamanho={14} />
            </Flex>
            <Ponto tom={natureza === NATUREZA_ENTRADA ? "bom" : "ruim"} />
            {rotulo}
          </BotaoNu>
        </Celula>
        {meses.map((mes) => {
          const total = totalPorMes[mes] ?? 0;
          const realizado = realizadoPorMes[mes] ?? 0;
          return (
            <Celula key={mes} aDireita forte realcada={mes === mesCorrente}>
              {/* ⚠️ Travessão no mês sem movimento, igual às categorias
                  abaixo: `R$ 0,00` na linha de seção e `—` na categoria era
                  a mesma ausência escrita de duas formas na mesma tabela --
                  e o zero em doze colunas esconde os meses que têm número. */}
              {total === 0 ? (
                <Text as="span" color="fg.subtle" fontWeight="400">—</Text>
              ) : (
                <Flex direction="column" align="flex-end" gap="1px">
                  <Text as="span" fontFamily="mono">R$ {formatarCentavos(total)}</Text>
                  {realizado !== total && (
                    <Text as="span" fontFamily="mono" fontSize="11px" fontWeight="400" color="fg.subtle">
                      R$ {formatarCentavos(realizado)} realizado
                    </Text>
                  )}
                </Flex>
              )}
            </Celula>
          );
        })}
        <Celula aDireita forte fundo="bg.canvas">R$ {formatarCentavos(totalDaSecao)}</Celula>
      </Table.Row>

      {!dobrada && linhas.map((linha) => (
        <Table.Row key={linha.categoria_id}>
          <Celula fixa>
            <Flex align="center" gap="8px" pl="18px">
              {/* A bolinha na cor da categoria, como na lista de lançamentos.
                  Cor vazia (categoria apagada) não desenha ponto nenhum. */}
              {linha.cor && (
                <Text
                  as="span" w="8px" h="8px" borderRadius="full" flexShrink="0"
                  css={{ background: linha.cor }}
                />
              )}
              <Text as="span" fontSize="13px">{linha.nome}</Text>
            </Flex>
          </Celula>
          {meses.map((mes) => (
            <Celula key={mes} aDireita realcada={mes === mesCorrente}>
              {/* ⚠️ Travessão no mês sem movimento: `R$ 0,00` numa tabela de
                  24 colunas é ruído que esconde os meses que têm número. */}
              {linha.por_mes[mes]
                ? `R$ ${formatarCentavos(linha.por_mes[mes])}`
                : <Text as="span" color="fg.subtle">—</Text>}
            </Celula>
          ))}
          <Celula aDireita forte>R$ {formatarCentavos(linha.total_centavos)}</Celula>
        </Table.Row>
      ))}
    </>
  );
}
