import { Box, Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../BotaoNu";
import { IconeAlerta, IconeCheck, IconeX } from "../Icons";
import { ACAO_DO_AVISO, FECHAR_DO_AVISO, PRAZO_DO_AVISO } from "../../theme/aviso";
import type { AvisoProps } from "./types";

/** Um aviso (`.toast` do artifact): pílula escura com o ícone colorido à
 * esquerda.
 *
 * O fundo é o MESMO nos dois casos, de propósito -- quem distingue é o
 * ícone. Aviso vermelho inteiro no canto da tela compete com o conteúdo, e
 * uma falha ao salvar não é um alarme.
 *
 * 🔴 **Com Desfazer, o aviso deixa de ser um botão.** Sem ação, a pílula
 * inteira dispensa ao clique; com ação, ela viraria botão dentro de botão --
 * conteúdo interativo aninhado, HTML inválido, e o clique ficaria ambíguo
 * entre desfazer e dispensar. Aí a pílula é um bloco com DOIS botões, como o
 * artefato validado desenha: DESFAZER e o X.
 */
export default function Aviso({ item, onFechar }: AvisoProps) {
  const ehErro = item.tipo === "erro";
  /* A forma muda junto com a cor: um erro com o MESMO tique, só que vermelho,
     se lê como sucesso pra quem olha de canto de olho. */
  const icone = (
    <Flex color={ehErro ? "status.bad" : "status.good"}>
      {ehErro ? <IconeAlerta /> : <IconeCheck />}
    </Flex>
  );

  if (item.onDesfazer) {
    const desfazer = item.onDesfazer;
    return (
      <Flex
        data-tipo={item.tipo}
        position="relative"
        overflow="hidden"
        alignItems="center"
        gap="9px"
        maxW="440px"
        p="11px 12px 11px 16px"
        borderRadius="sm"
        bg="fg"
        color="white"
        boxShadow="md"
        fontSize="13px"
        fontWeight="600"
        textAlign="left"
        css={{
          "& > div > svg": { width: "15px", height: "15px", flex: "0 0 auto" },
          animation: "aviso-entrar .15s ease",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {icone}
        <Text flex="1">{item.mensagem}</Text>
        <BotaoNu
          type="button"
          css={ACAO_DO_AVISO}
          onClick={() => {
            /* Fecha JUNTO: deixar o aviso de pé depois de desfazer faria a
               pessoa clicar de novo -- e a segunda chamada inversa desfaria o
               desfazer. */
            onFechar();
            desfazer();
          }}
        >
          Desfazer
        </BotaoNu>
        <BotaoNu type="button" css={FECHAR_DO_AVISO} onClick={onFechar} aria-label="Dispensar aviso">
          <IconeX />
        </BotaoNu>
        <Box css={PRAZO_DO_AVISO} aria-hidden="true" />
      </Flex>
    );
  }

  return (
    <BotaoNu
      type="button"
      /* Clicar dispensa: o tempo é calibrado pra ler uma frase, e quem já
         leu não devia ter que esperar. */
      onClick={onFechar}
      aria-label="Dispensar aviso"
      /* O que separa erro de sucesso é o ícone, que é decorativo (e
         portanto invisível pra quem inspeciona o DOM). Isto dá um nome ao
         estado -- pro teste e pra quem depura. */
      data-tipo={item.tipo}
      display="flex"
      alignItems="center"
      gap="9px"
      maxW="360px"
      p="11px 16px"
      borderRadius="sm"
      bg="fg"
      color="white"
      boxShadow="md"
      fontSize="13px"
      fontWeight="600"
      textAlign="left"
      cursor="pointer"
      css={{
        "& svg": { width: "15px", height: "15px", flex: "0 0 auto" },
        animation: "aviso-entrar .15s ease",
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {icone}
      {item.mensagem}
    </BotaoNu>
  );
}
