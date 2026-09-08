import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";

import Botao from "../../../../components/Botao";
import { BotaoNu } from "../../../../components/BotaoNu";
import { IconeChevron } from "../../../../components/Icons";
import Ponto from "../../../../components/Ponto";
import { useFecharAoClicarFora } from "../../../../hooks/useFecharAoClicarFora";
import { PAINEL_DE_MENU } from "../../../../theme/menu";
import { OPCOES_DE_NOVO_LANCAMENTO } from "../../constants";
import type { MenuDeNovoLancamentoProps } from "./types";

/** O botão "+ Novo lançamento" e as quatro portas que ele abre.
 *
 * 🔴 **Um menu, e não quatro botões.** Os quatro formulários são diferentes
 * o bastante para não caberem num só (honorário tem parcelas e fatura;
 * transferência não tem categoria nem cliente), e quatro botões no cabeçalho
 * fariam a pessoa escolher antes de saber o que cada um pede. A frase abaixo
 * de cada nome é o que responde isso -- ela vem do artefato.
 *
 * ⚠️ **Fecha ao escolher, e ao clicar fora.** Um menu que continua aberto
 * por cima do modal que ele abriu rouba o clique do primeiro campo.
 */
export default function MenuDeNovoLancamento({ onEscolher }: MenuDeNovoLancamentoProps) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLDivElement>(null);

  useFecharAoClicarFora(aberto, () => setAberto(false), "[data-menu-de-lancamento]");

  return (
    <Box position="relative" ref={ancora} data-menu-de-lancamento>
      <Botao onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto}>
        + Novo lançamento
        <IconeChevron />
      </Botao>

      {aberto && (
        <Box
          role="menu"
          position="absolute"
          right="0"
          top="46px"
          zIndex="20"
          css={{ ...PAINEL_DE_MENU, minWidth: "220px" }}
        >
          {OPCOES_DE_NOVO_LANCAMENTO.map((opcao) => (
            <BotaoNu
              key={opcao.forma}
              role="menuitem"
              type="button"
              display="block"
              w="100%"
              p="9px 10px"
              borderRadius="sm"
              textAlign="left"
              cursor="pointer"
              _hover={{ bg: "bg.canvas" }}
              onClick={() => {
                setAberto(false);
                onEscolher(opcao.forma);
              }}
            >
              <Flex gap="10px" align="flex-start">
                <Ponto tom={opcao.tom} noTopo />
                <Stack gap="0">
                  <Text fontSize="13.5px" fontWeight="600">{opcao.rotulo}</Text>
                  <Text fontSize="11.5px" color="fg.subtle">{opcao.descricao}</Text>
                </Stack>
              </Flex>
            </BotaoNu>
          ))}
        </Box>
      )}
    </Box>
  );
}
