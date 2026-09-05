import { Flex } from "@chakra-ui/react";

import { BotaoNu } from "../BotaoNu";
import { IconeAlerta, IconeCheck } from "../Icons";
import type { AvisoProps } from "./types";

/** Um aviso (`.toast` do artifact): pílula escura com o ícone colorido à
 * esquerda.
 *
 * O fundo é o MESMO nos dois casos, de propósito -- quem distingue é o
 * ícone. Aviso vermelho inteiro no canto da tela compete com o conteúdo, e
 * uma falha ao salvar não é um alarme.
 */
export default function Aviso({ item, onFechar }: AvisoProps) {
  const ehErro = item.tipo === "erro";
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
      {/* A forma muda junto com a cor: um erro com o MESMO tique, só que
          vermelho, se lê como sucesso pra quem olha de canto de olho. */}
      <Flex color={ehErro ? "status.bad" : "status.good"}>
        {ehErro ? <IconeAlerta /> : <IconeCheck />}
      </Flex>
      {item.mensagem}
    </BotaoNu>
  );
}
