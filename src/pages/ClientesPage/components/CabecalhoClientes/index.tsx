import { Box, Flex, Heading, Text } from "@chakra-ui/react";

import { Botao, CampoDeBusca } from "../../../../components";
import { contar } from "../../../../utils";
import type { CabecalhoClientesProps } from "./types";

/** Cabeçalho da tela de Clientes: título, ação, busca e contagem -- mesma
 * estrutura do cabeçalho de Processos. */
export default function CabecalhoClientes({
  carregando,
  buscando,
  total,
  exibidos,
  busca,
  onBuscar,
  podeCriar,
  onNovoCliente,
}: CabecalhoClientesProps) {
  return (
    <Box mb="14px">
      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px">
        <Box>
          <Heading as="h1" fontSize="23px" fontWeight="800" letterSpacing="-0.01em">
            Clientes
          </Heading>
          <Text fontSize="13px" color="fg.muted" mt="2px">
            Contatos e partes vinculadas aos processos.
          </Text>
        </Box>
        {podeCriar && (
          <Box flexShrink={0}>
            <Botao onClick={onNovoCliente}>+ Novo cliente</Botao>
          </Box>
        )}
      </Flex>

      <Flex gap="10px" mb="10px">
        <CampoDeBusca
          rotulo="Pesquisar cliente"
          placeholder="Pesquisar cliente"
          valor={busca}
          onMudar={onBuscar}
          larguraMaxima="420px"
          buscando={buscando}
        />
      </Flex>

      {/* Some enquanto carrega, em vez de dizer "carregando…": o esqueleto
          logo abaixo já é o recado, e duas mensagens da mesma espera na
          mesma tela é ruído. Mantém a linha ocupando o espaço pra a
          contagem não empurrar a tabela ao chegar. */}
      <Text fontSize="11.5px" color="fg.subtle" className="num" minH="17px">
        {carregando
          ? ""
          : !buscando && busca && exibidos < total
            ? `Mostrando ${exibidos} de ${contar(total, "cliente", "clientes")} — refine a busca`
            : contar(total, "cliente", "clientes")}
      </Text>
    </Box>
  );
}
