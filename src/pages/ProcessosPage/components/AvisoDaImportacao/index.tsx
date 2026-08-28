import { Box, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface AvisoDaImportacaoProps {
  titulo: string;
  /** O corpo -- uma frase que diz o que fazer a seguir, não só o que houve. */
  children: ReactNode;
}

/** A faixa âmbar da tela de importação: nada encontrado, erro do servidor,
 * busca no teto.
 *
 * ⚠️ O semáforo do projeto (`status.*`), não o `bg.warning` do Chakra: aquele
 * é laranja da paleta DELE e sai de tom ao lado do cartão de "já estão neste
 * subgrupo", que usa o âmbar daqui.
 */
export default function AvisoDaImportacao({ titulo, children }: AvisoDaImportacaoProps) {
  return (
    <Box
      mb="18px"
      p="14px 16px"
      bg="status.warn.bg"
      border="1px solid"
      borderColor="status.warn"
      borderRadius="10px"
    >
      <Text fontSize="14px" fontWeight="800" mb="4px">
        {titulo}
      </Text>
      <Text fontSize="13px" color="fg.muted">
        {children}
      </Text>
    </Box>
  );
}
