import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BotaoNu } from "../../../../components";
import { ESPERA_DA_BUSCA_MS } from "../../../../constants/busca";
import { MINIMO_PRA_BUSCAR, RESULTADOS_POR_TIPO } from "../../../../constants/vinculoDaTarefa";
import { Z_INDEX_CALENDARIO } from "../../../../constants/camadaFlutuante";
import { useValorComEspera } from "../../../../hooks/useValorComEspera";
import { listarClientes } from "../../../../services";
import { OPCAO_LINHA } from "../../../../theme/painelFiltro";
import type { Cliente } from "../../../../types";
import type {
  RespostaDeClientes,
} from "../../../../types/respostas";

interface Props {
  id: string;
  /** Ids escolhidos. */
  valor: string[];
  /** Nome de cada id escolhido -- a etiqueta precisa mostrar nome, e o
   * resultado da busca some quando o termo muda. Guardado por fora pra que
   * a etiqueta não dependa de a busca ainda estar na tela. */
  nomes: Map<string, string>;
  onMudar: (ids: string[], nomes: Map<string, string>) => void;
}

/** Busca de clientes com escolha MÚLTIPLA (o `af-cliente-*` do artifact).
 *
 * Busca, e não um seletor com a lista toda: um escritório tem centenas de
 * clientes, e carregá-los todos pra escolher dois é o que o artifact evita
 * de propósito.
 *
 * A partir de 3 caracteres e com espera entre teclas, como as outras buscas
 * do sistema. Quem já foi escolhido não volta a aparecer nos resultados --
 * escolher duas vezes o mesmo cliente não significa nada.
 */
export default function CampoDeClientes({ id, valor, nomes, onMudar }: Props) {
  const [texto, setTexto] = useState("");
  const termo = useValorComEspera(texto.trim(), ESPERA_DA_BUSCA_MS);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  /* Fecha ao clicar fora. O campo vive DENTRO de um modal, então não dá pra
     depender do descarte do modal -- ele fecharia a tela inteira. */
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  const busca = termo.length >= MINIMO_PRA_BUSCAR ? termo : "";

  const query = useQuery<RespostaDeClientes>({
    queryKey: ["busca-clientes", busca],
    enabled: Boolean(busca),
    queryFn: () =>
      listarClientes({ busca, tamanhoPagina: RESULTADOS_POR_TIPO }) as Promise<RespostaDeClientes>,
  });

  const achados = (query.data?.clientes || []).filter((c) => !valor.includes(c.cliente_id));

  function escolher(cliente: Cliente) {
    const novos = new Map(nomes);
    novos.set(cliente.cliente_id, cliente.nome);
    onMudar([...valor, cliente.cliente_id], novos);
    setTexto("");
    setAberto(false);
  }

  function remover(clienteId: string) {
    onMudar(
      valor.filter((v) => v !== clienteId),
      nomes,
    );
  }

  return (
    <Box ref={caixa} position="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Digite o nome do cliente"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
      />

      {aberto && busca && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="4px"
          zIndex={Z_INDEX_CALENDARIO}
          bg="bg.surface"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="border"
          borderRadius="md"
          boxShadow="md"
          overflow="hidden"
        >
          {query.isPending ? (
            <Text p={OPCAO_LINHA.padding} fontSize={OPCAO_LINHA.fonte} color="fg.subtle">
              Carregando…
            </Text>
          ) : achados.length === 0 ? (
            <Text p={OPCAO_LINHA.padding} fontSize={OPCAO_LINHA.fonte} color="fg.subtle">
              Nada encontrado
            </Text>
          ) : (
            achados.map((cliente) => (
              <BotaoNu
                key={cliente.cliente_id}
                type="button"
                onClick={() => escolher(cliente)}
                display="block"
                w="100%"
                p={OPCAO_LINHA.padding}
                fontSize={OPCAO_LINHA.fonte}
                _hover={{ bg: "bg.canvas" }}
              >
                {cliente.nome}
              </BotaoNu>
            ))
          )}
        </Box>
      )}

      {valor.length > 0 && (
        <Flex gap="6px" wrap="wrap" mt="8px">
          {valor.map((clienteId) => (
            <Flex
              key={clienteId}
              align="center"
              gap="6px"
              bg="bg.brand.subtle"
              color="brand.darker"
              borderRadius="999px"
              px="10px"
              py="4px"
              fontSize="12px"
              fontWeight="700"
            >
              {/* Nome, nunca o id: a etiqueta é o único lugar onde a pessoa
                  confere se escolheu o cliente certo. */}
              {nomes.get(clienteId) ?? clienteId}
              {/* Mesmo "✕" do fechar do Modal -- é caractere, não ícone, e
                  ter um SVG só pra este X faria dois desenhos pro mesmo
                  gesto. */}
              <BotaoNu
                type="button"
                aria-label={`Remover ${nomes.get(clienteId) ?? clienteId}`}
                onClick={() => remover(clienteId)}
                display="flex"
                color="inherit"
                fontSize="11px"
              >
                ✕
              </BotaoNu>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}
