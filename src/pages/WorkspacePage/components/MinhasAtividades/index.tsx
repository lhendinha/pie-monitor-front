import { Box, Flex, Text } from "@chakra-ui/react";

import { Cartao, EstadoDeErro, Esqueleto } from "../../../../components";
import type { ResumoDaAreaDeTrabalho } from "../../../../types";

interface Props {
  resumo?: ResumoDaAreaDeTrabalho;
  carregando: boolean;
  /** A consulta falhou.
   *
   * Sem isto, os `?? 0` espalhados aqui transformavam a falha em ZERO:
   * "Tarefas atrasadas: 0", com barra desenhada e tudo. É o número que a
   * pessoa abre o app pra ver, e zero é a resposta que ela mais quer --
   * então a mentira passa sem ser questionada. */
  falhou?: boolean;
  onTentarDeNovo?: () => void;
  tentando?: boolean;
}

/** Concluídas, atrasadas e a concluir -- das MINHAS tarefas.
 *
 * Os três números vêm do `/resumo`, e não somados aqui: "concluída" é estar
 * na coluna marcada como conclusão, que varia por subgrupo, então o cliente
 * teria que buscar o quadro de cada subgrupo em que a pessoa tem tarefa. E
 * são contagens sobre a coleção inteira, que a paginação não entrega.
 */
export default function MinhasAtividades({
  resumo,
  carregando,
  falhou,
  onTentarDeNovo,
  tentando,
}: Props) {
  const barras = [
    { rotulo: "Concluídas", valor: resumo?.minhas_concluidas ?? 0, cor: "status.good" },
    { rotulo: "Atrasadas", valor: resumo?.minhas_atrasadas ?? 0, cor: "status.bad" },
    { rotulo: "A concluir", valor: resumo?.minhas_a_concluir ?? 0, cor: undefined },
  ];
  /* O maior valor define a escala. `|| 1` porque com tudo zerado a divisão
     seria por zero -- e aí as três barras ficam no mínimo, que é o certo. */
  const maior = Math.max(...barras.map((b) => b.valor), 1);

  return (
    <Cartao titulo="Minhas atividades">
      {falhou ? (
        <EstadoDeErro
          mensagem="Não foi possível carregar seus números."
          onTentarDeNovo={() => onTentarDeNovo?.()}
          tentando={tentando}
        />
      ) : carregando ? (
        <Esqueleto linhas={2} />
      ) : (
        <>
          <Flex gap="10px">
            {barras.map((b) => (
              <Box
                key={b.rotulo}
                flex="1"
                p="14px"
                textAlign="center"
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="md"
              >
                <Text fontSize="24px" fontWeight="800" fontFamily="mono" color={b.cor}>
                  {b.valor}
                </Text>
                <Text
                  fontSize="11.5px"
                  fontWeight="700"
                  textTransform="uppercase"
                  letterSpacing="0.03em"
                  color="fg.subtle"
                  mt="2px"
                >
                  {b.rotulo}
                </Text>
              </Box>
            ))}
          </Flex>

          {/* As barras repetem os mesmos três números em forma: o número diz
              quanto, a altura diz a proporção entre eles -- que é o que se
              lê de relance. */}
          <Flex align="flex-end" gap="16px" h="110px" mt="18px" px="4px" aria-hidden="true">
            {barras.map((b) => (
              <Flex key={b.rotulo} direction="column" align="center" gap="6px" flex="1">
                <Flex w="100%" maxW="46px" h="84px" bg="border.subtle" borderRadius="6px 6px 3px 3px" align="flex-end" overflow="hidden">
                  <Box
                    w="100%"
                    /* Mínimo de 6%: barra de valor zero sumiria, e uma
                       lacuna no meio do gráfico se lê como erro, não como
                       zero. */
                    h={`${Math.max(6, (b.valor / maior) * 100)}%`}
                    borderRadius="6px 6px 0 0"
                    bgGradient="to-b"
                    gradientFrom="brand"
                    gradientTo="brand.dark"
                    transition="height .4s ease"
                  />
                </Flex>
                <Text fontSize="11.5px" fontWeight="700" color="fg.subtle" className="num">
                  {b.valor}
                </Text>
              </Flex>
            ))}
          </Flex>
        </>
      )}
    </Cartao>
  );
}
