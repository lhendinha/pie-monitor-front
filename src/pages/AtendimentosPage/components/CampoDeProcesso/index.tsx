import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BotaoNu } from "../../../../components";
import { ESPERA_DA_BUSCA_MS } from "../../../../constants/busca";
import { MINIMO_PRA_BUSCAR, RESULTADOS_POR_TIPO } from "../../../../constants/vinculoDeRegistro";
import { Z_INDEX_CALENDARIO } from "../../../../constants/camadaFlutuante";
import { useValorComEspera } from "../../../../hooks/useValorComEspera";
import { listarProcessos } from "../../../../services";
import { OPCAO_LINHA } from "../../../../theme/painelFiltro";
import { mascararNumeroProcesso } from "../../../../utils";
import type { ProcessoEscolhido } from "../../types";
import type {
  RespostaDeProcessos,
} from "../../../../types/respostas";

interface CampoDeProcessoProps {
  id: string;
  valor: ProcessoEscolhido | null;
  onMudar: (escolhido: ProcessoEscolhido | null) => void;
}

/** Busca de processo com escolha ÚNICA (o `af-proc-*` do artifact).
 *
 * Um slot só, como no banco: `processo_numero` é um campo, não uma lista.
 * Escolher outro TROCA o anterior.
 *
 * Irmão de `CampoDeClientes` e não o mesmo componente com uma flag: a
 * diferença não é só "quantos", é o que cada um busca, o que mostra na
 * etiqueta e o que devolve. Um componente com `multiplo?: boolean` teria
 * dois caminhos separados do começo ao fim.
 */
export default function CampoDeProcesso({ id, valor, onMudar }: CampoDeProcessoProps) {
  const [texto, setTexto] = useState("");
  const termo = useValorComEspera(texto.trim(), ESPERA_DA_BUSCA_MS);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  const busca = termo.length >= MINIMO_PRA_BUSCAR ? termo : "";

  const query = useQuery<RespostaDeProcessos>({
    queryKey: ["busca-processos-atendimento", busca],
    enabled: Boolean(busca),
    queryFn: () =>
      listarProcessos({ busca, tamanhoPagina: RESULTADOS_POR_TIPO }) as Promise<RespostaDeProcessos>,
  });

  const achados = query.data?.processos || [];

  return (
    <Box ref={caixa} position="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Encontre um processo"
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
            achados.map((processo) => {
              const rotulo = mascararNumeroProcesso(processo.numero_processo);
              return (
                <BotaoNu
                  key={processo.numero_processo}
                  type="button"
                  onClick={() => {
                    onMudar({ numero: processo.numero_processo, rotulo });
                    setTexto("");
                    setAberto(false);
                  }}
                  display="block"
                  w="100%"
                  p={OPCAO_LINHA.padding}
                  fontSize={OPCAO_LINHA.fonte}
                  _hover={{ bg: "bg.canvas" }}
                >
                  {rotulo}
                </BotaoNu>
              );
            })
          )}
        </Box>
      )}

      {valor && (
        <Flex
          align="center"
          gap="6px"
          mt="8px"
          w="fit-content"
          bg="bg.brand.subtle"
          color="brand.darker"
          borderRadius="999px"
          px="10px"
          py="4px"
          fontSize="12px"
          fontWeight="700"
        >
          {valor.rotulo}
          <BotaoNu
            type="button"
            aria-label={`Remover ${valor.rotulo}`}
            onClick={() => onMudar(null)}
            display="flex"
            color="inherit"
            fontSize="11px"
          >
            ✕
          </BotaoNu>
        </Flex>
      )}
    </Box>
  );
}
