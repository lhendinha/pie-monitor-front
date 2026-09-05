import { Box, Table, Text } from "@chakra-ui/react";
import type { CelulaComSubProps } from "./types";

/** Célula de duas linhas: o valor e um detalhe menor embaixo.
 *
 * ⚠️ O peso padrão é o do corpo (400). No artifact `.tbl td` não declara
 * peso nenhum -- só `.proc-num` é 700. Emitir 600 em toda célula deixava a
 * tabela inteira parecendo negrito.
 *
 * Medidas do artifact: `.tbl td` 13px 14px com divisória em `line-soft`,
 * `.cell-sub` 12px em `slate-2` com 2px de respiro.
 */
export default function CelulaComSub({
  principal,
  sub,
  variante = "padrao",
  largura,
}: CelulaComSubProps) {
  const processo = variante === "processo";
  const forte = processo || variante === "destaque";
  return (
    <Table.Cell
      w={largura}
      verticalAlign="top"
      p="13px 14px"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      fontSize="13px"
      fontWeight="400"
    >
      <Box
        fontFamily={processo ? "mono" : undefined}
        fontWeight={forte ? "700" : undefined}
        fontSize={processo ? "12.5px" : undefined}
        color="fg"
      >
        {principal}
      </Box>
      {sub ? (
        <Text
          fontSize="12px"
          fontFamily={processo ? "mono" : undefined}
          color="fg.subtle"
          mt="2px"
        >
          {sub}
        </Text>
      ) : null}
    </Table.Cell>
  );
}
