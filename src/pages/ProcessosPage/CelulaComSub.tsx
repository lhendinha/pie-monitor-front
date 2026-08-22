import { Box, Table, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  principal: ReactNode;
  sub?: ReactNode;
  mono?: boolean;
}

/** Célula de duas linhas: o valor e um detalhe menor embaixo.
 *
 * A tabela usa esse padrão em quase toda coluna (número + apelido, situação
 * + fase, movimentação + data). Ter um componente evita repetir o mesmo par
 * de tamanhos e cores em seis lugares e sair do token por descuido. */
export default function CelulaComSub({ principal, sub, mono }: Props) {
  return (
    <Table.Cell verticalAlign="top" py="10px">
      <Box
        fontWeight={mono ? "700" : "600"}
        fontSize={mono ? "12.5px" : "13px"}
        fontFamily={mono ? "mono" : undefined}
        color="fg.default"
      >
        {principal}
      </Box>
      {sub ? (
        <Text fontSize="12px" color="fg.subtle" mt="2px">
          {sub}
        </Text>
      ) : null}
    </Table.Cell>
  );
}
