import { Box, Input, Text } from "@chakra-ui/react";

import { formatarCentavos } from "../../utils";
import type { CampoDeValorProps } from "./types";

/** O campo de dinheiro: máscara `R$ 0,00` que devolve CENTAVOS inteiros.
 *
 * 🔴 **A máscara conta da DIREITA para a esquerda**, como caixa eletrônico:
 * o que a pessoa digita são dígitos, e cada um empurra o número uma casa.
 * "1" é R$ 0,01; "1234" é R$ 12,34. Foi escolhido assim porque a
 * alternativa -- deixar digitar livre e formatar depois -- briga com o
 * cursor: reescrever o texto a cada tecla joga o caret para o fim no meio
 * de uma correção, e quem tenta consertar o terceiro dígito perde a
 * posição. Aqui o caret está sempre no fim, e nunca há o que disputar.
 *
 * ⚠️ **Letra não é recusada com erro, ela simplesmente não entra.** Um campo
 * que pisca vermelho porque alguém encostou no "a" ensina menos que um que
 * ignora. O mesmo vale para o sinal: quantia é positiva, e quem decide se
 * aparece como `−480,00` é a tela, que sabe a natureza do lançamento.
 *
 * ⚠️ O "R$" é PREFIXO fixo dentro da caixa, e não parte do texto digitável:
 * dentro do valor ele viraria caractere para apagar por engano.
 *
 * ➡️ `index.test.tsx`; a conversão mora em `utils/dinheiro`.
 */
export default function CampoDeValor({
  id, valor, onMudar, placeholder = "0,00", desabilitado,
}: CampoDeValorProps) {
  const texto = valor === null ? "" : formatarCentavos(valor);

  function aoDigitar(bruto: string) {
    const digitos = bruto.replace(/\D/g, "");
    // ⚠️ Vazio devolve `null`, e não zero: é o que deixa o formulário saber
    // que ninguém preencheu.
    onMudar(digitos ? Number(digitos) : null);
  }

  return (
    <Box position="relative">
      <Text
        position="absolute"
        zIndex="1"
        left="11px"
        top="50%"
        transform="translateY(-50%)"
        fontSize="13px"
        color="fg.muted"
        pointerEvents="none"
      >
        R$
      </Text>
      <Input
        id={id}
        /* ⚠️ `inputMode` e não `type="number"`: o número do HTML traz setas,
           aceita `e` e `-`, e no celular abre um teclado com vírgula que a
           máscara ignoraria. Aqui o texto é sempre o que a máscara escreveu. */
        inputMode="numeric"
        value={texto}
        placeholder={placeholder}
        disabled={desabilitado}
        onChange={(e) => aoDigitar(e.target.value)}
        pl="34px"
        textAlign="right"
      />
    </Box>
  );
}
