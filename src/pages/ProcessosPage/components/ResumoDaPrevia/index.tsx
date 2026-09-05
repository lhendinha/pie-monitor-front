import { Box } from "@chakra-ui/react";

import { concordar } from "../../../../utils/importacao";
import CartaoDeResumo from "../CartaoDeResumo";

interface ResumoDaPreviaProps {
  encontrados: number;
  /** Os marcados AGORA -- é o que o segundo cartão conta. */
  marcados: number;
  jaExistem: number;
  noutroSubgrupo: number;
}

/** Os quatro cartões que abrem a prévia da importação: quantos achei,
 * quantos entram, quantos não, e o recorte dos que também estão noutro
 * subgrupo. */
export default function ResumoDaPrevia({ encontrados, marcados, jaExistem, noutroSubgrupo }: ResumoDaPreviaProps) {
  /* `.resumo` do desenho: grade que se reparte sozinha, não uma fileira
     de `flex: 1` -- com quatro cartões estreitos a diferença aparece na
     quebra, onde o `flex` deixa um sozinho esticado na segunda linha. */
  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fit, minmax(136px, 1fr))"
      gap="12px"
      mb="18px"
    >
      <CartaoDeResumo
        numero={encontrados}
        rotulo={concordar(encontrados, "encontrado", "encontrados")}
      />
      {/* ⚠️ "seriam cadastrados", não "novos": o cartão responde o que
          acontece se a pessoa confirmar, e é o número que ela confere antes
          de clicar. "Novos" descreveria a lista; este descreve a ação.

          ⚠️ E "NESTE SUBGRUPO" no fim, porque sem isso o cartão respondia
          uma pergunta mais larga do que a que ele responde: com 21 de 23
          já acompanhados em outro lugar, "21 seriam cadastrados" se lê
          como "21 são novos no sistema" -- e nenhum é.

          🔴 E vem ANTES do "já estão neste subgrupo", como no desenho: a
          ordem é a da decisão -- quantos achei, quantos entram, quantos
          não. Pôr o impedimento no meio interrompe a leitura. */}
      {/* 🔴 Segue a SELEÇÃO, não o total de importáveis: desmarcar cinco e
          o cartão continuar dizendo que eles "seriam cadastrados" seria
          uma promessa que o botão logo abaixo não cumpre. */}
      <CartaoDeResumo
        numero={marcados}
        rotulo={concordar(
          marcados,
          "seria cadastrado neste subgrupo",
          "seriam cadastrados neste subgrupo",
        )}
        tom="bom"
      />
      <CartaoDeResumo
        numero={jaExistem}
        rotulo={concordar(jaExistem, "já está neste subgrupo", "já estão neste subgrupo")}
        tom="atencao"
      />
      {/* 🔴 Azul, e não verde nem âmbar: verde diria "entra", âmbar diria
          "não entra", e este número não é nem um nem outro -- é um RECORTE
          dos que entram, para quem quiser desmarcar.

          ⚠️ E "TAMBÉM" carrega a aritmética: os três primeiros somam
          (novos + já aqui = encontrados); este é subconjunto dos novos, não
          uma quarta parcela. */}
      <CartaoDeResumo
        numero={noutroSubgrupo}
        rotulo={concordar(
          noutroSubgrupo,
          "também em outro subgrupo",
          "também em outros subgrupos",
        )}
        tom="marca"
      />
    </Box>
  );
}
