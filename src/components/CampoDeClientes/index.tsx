import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

import { BotaoNu } from "../BotaoNu";
import { IconeX } from "../Icons";
import { ESPERA_DA_BUSCA_MS } from "../../constants/busca";
import { Z_INDEX_CALENDARIO } from "../../constants/camadaFlutuante";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import { useClientesBuscaveis } from "../../hooks/useOpcoesBuscaveis";
import { OPCAO_LINHA } from "../../theme/painelFiltro";

interface CampoDeClientesProps {
  id: string;
  /** Ids escolhidos. */
  valor: string[];
  /** Nome de cada id escolhido -- a etiqueta precisa mostrar nome, e o
   * resultado da busca some quando o termo muda. Guardado por fora pra que
   * a etiqueta não dependa de a busca ainda estar na tela. */
  nomes: Map<string, string>;
  onMudar: (ids: string[], nomes: Map<string, string>) => void;
}

/** Escolha de vários clientes, por busca.
 *
 * Busca, e não um seletor com a lista toda: um escritório tem centenas de
 * clientes, e carregá-los todos pra escolher dois é o custo que este campo
 * existe pra evitar.
 *
 * 🔴 A lista aparece ao FOCAR, com a primeira página em ordem alfabética --
 * antes exigia três caracteres antes de mostrar qualquer coisa, e até lá o
 * campo era uma caixa de texto muda: quem não lembrava a grafia do nome não
 * tinha por onde começar. É a mesma regra das pílulas de filtro (*toda lista
 * que pode crescer sem limite carrega a primeira página e se completa por
 * busca*), e as duas telas que oferecem cliente passam a se comportar igual.
 *
 * ⚠️ Vive em `components/`, e não dentro de uma página: Atendimentos e
 * Processos usam os dois.
 */
export default function CampoDeClientes({ id, valor, nomes, onMudar }: CampoDeClientesProps) {
  const [texto, setTexto] = useState("");
  const termo = useValorComEspera(texto.trim(), ESPERA_DA_BUSCA_MS);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const clientes = useClientesBuscaveis();
  const { buscar } = clientes;

  /* Nada é pedido antes de a pessoa mexer no campo -- a primeira chamada
     acontece no foco, e as seguintes acompanham o que ela digita. */
  useEffect(() => {
    if (aberto) buscar(termo);
  }, [aberto, termo, buscar]);

  /* Fecha ao clicar fora. O campo vive DENTRO de um modal, então não dá pra
     depender do descarte do modal -- ele fecharia a tela inteira. */
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  /* Escolher duas vezes o mesmo cliente não significa nada. */
  const achados = clientes.opcoes.filter((o) => !valor.includes(o.value));

  function escolher(opcao: { value: string; label: string }) {
    const novos = new Map(nomes);
    novos.set(opcao.value, opcao.label);
    onMudar([...valor, opcao.value], novos);
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
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
      />

      {aberto && (
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
          {/* Três respostas diferentes pra uma lista vazia -- ver
              `FalhaDoPainel`. "Nada encontrado" dito depois de uma consulta
              que falhou é uma afirmação sobre o cadastro do escritório
              tirada de um erro de rede. */}
          {clientes.erro ? (
            <Flex direction="column" gap="8px" align="flex-start" p={OPCAO_LINHA.padding}>
              <Text fontSize={OPCAO_LINHA.fonte} color="status.bad" fontWeight="600">
                Não foi possível carregar a lista.
              </Text>
              <BotaoNu
                type="button"
                onClick={clientes.tentarDeNovo}
                fontSize={OPCAO_LINHA.fonte}
                fontWeight="700"
                textDecoration="underline"
              >
                Tentar de novo
              </BotaoNu>
            </Flex>
          ) : clientes.carregando && achados.length === 0 ? (
            <Text p={OPCAO_LINHA.padding} fontSize={OPCAO_LINHA.fonte} color="fg.subtle">
              Carregando…
            </Text>
          ) : achados.length === 0 ? (
            <Text p={OPCAO_LINHA.padding} fontSize={OPCAO_LINHA.fonte} color="fg.subtle">
              Nada encontrado
            </Text>
          ) : (
            /* Mantém o resultado anterior na tela enquanto o próximo vem,
               esmaecido. Esvaziar a cada tecla fazia o painel piscar. */
            <Box opacity={clientes.carregando ? 0.45 : 1} transition="opacity 120ms">
              {achados.map((opcao) => (
                <BotaoNu
                  key={opcao.value}
                  type="button"
                  onClick={() => escolher(opcao)}
                  display="block"
                  w="100%"
                  p={OPCAO_LINHA.padding}
                  fontSize={OPCAO_LINHA.fonte}
                  _hover={{ bg: "bg.canvas" }}
                >
                  {opcao.label}
                </BotaoNu>
              ))}
            </Box>
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
              <BotaoNu
                type="button"
                aria-label={`Remover ${nomes.get(clienteId) ?? clienteId}`}
                onClick={() => remover(clienteId)}
                display="flex"
                color="inherit"
                css={{ "& svg": { width: "11px", height: "11px" } }}
              >
                <IconeX />
              </BotaoNu>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}
