import { Box, Input, Stack, Text, chakra } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Z_INDEX_CALENDARIO } from "../../../constants/camadaFlutuante";
import { listarAtendimentos, listarProcessos } from "../../../services";
import { OPCAO_LINHA } from "../../../theme/painelFiltro";
import { mascararNumeroProcesso } from "../../../utils";
import { ESPERA_DA_BUSCA_MS } from "../../../constants/busca";
import { useValorComEspera } from "../../../hooks/useValorComEspera";
import {
  MINIMO_PRA_BUSCAR,
  RESULTADOS_POR_TIPO,
} from "../../../constants/vinculoDaTarefa";
import EtiquetaDeVinculo from "../EtiquetaDeVinculo";
import type { Vinculo, VinculosDaTarefa } from "../../../types";
import type {
  RespostaDeAtendimentosResumidos,
  RespostaDeProcessos,
} from "../../../types/respostas";

interface Props {
  valor: VinculosDaTarefa;
  onMudar: (vinculos: VinculosDaTarefa) => void;
}

/** "Processo ou atendimento vinculado": uma busca que enxerga os DOIS.
 *
 * Dá pra vincular um processo E um atendimento na mesma tarefa -- são
 * campos independentes no backend (`processo_numero` e `atendimento_id`),
 * cada um com um valor. Por isso os escolhidos ficam como etiquetas embaixo
 * da busca, em vez de o campo guardar um item só: com um campo de valor
 * único não haveria onde mostrar o segundo.
 *
 * Escolher um processo TROCA o processo anterior, não empilha -- é um slot
 * por tipo, igual ao banco.
 *
 * Busca a partir de 3 caracteres, com espera entre teclas: o número de
 * processo tem 20 dígitos, e disparar a cada tecla seriam 20 requisições
 * pra uma resposta que só interessa no fim.
 */
export default function VinculoDaTarefa({ valor, onMudar }: Props) {
  const [texto, setTexto] = useState("");
  /** Mesmo debounce das outras buscas do sistema, agora num hook só. */
  const termo = useValorComEspera(texto.trim(), ESPERA_DA_BUSCA_MS);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  /** Fecha ao clicar fora. O campo vive DENTRO de um modal, então não dá
   * pra depender do descarte do modal -- ele fecharia a tela inteira. */
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  const busca = termo.length >= MINIMO_PRA_BUSCAR ? termo : "";

  const query = useQuery<Vinculo[]>({
    queryKey: ["vinculo-tarefa", busca],
    enabled: Boolean(busca),
    queryFn: async () => {
      // Em paralelo: são dois recursos independentes, e em série o campo
      // ficaria com o dobro da latência por tecla parada.
      const [processos, atendimentos] = await Promise.all([
        listarProcessos({ busca, tamanhoPagina: RESULTADOS_POR_TIPO }) as Promise<RespostaDeProcessos>,
        listarAtendimentos({ busca, tamanhoPagina: RESULTADOS_POR_TIPO }) as Promise<RespostaDeAtendimentosResumidos>,
      ]);
      return [
        ...(processos.processos ?? []).slice(0, RESULTADOS_POR_TIPO).map((p) => ({
          tipo: "processo" as const,
          id: p.numero_processo,
          rotulo: mascararNumeroProcesso(p.numero_processo),
          detalhe: p.apelido || undefined,
        })),
        ...(atendimentos.atendimentos ?? []).slice(0, RESULTADOS_POR_TIPO).map((a) => ({
          tipo: "atendimento" as const,
          id: a.atendimento_id,
          rotulo: a.assunto,
          detalhe: a.status || undefined,
        })),
      ];
    },
  });

  function escolher(item: Vinculo) {
    onMudar({ ...valor, [item.tipo]: item });
    // Limpa a busca: o texto não representa mais nada depois da escolha --
    // quem representa é a etiqueta. Deixá-lo faria a próxima busca começar
    // com o resto da anterior.
    setTexto("");
    setAberto(false);
  }

  const resultados = query.data ?? [];
  const mostrarPainel = aberto && Boolean(busca);
  const escolhidos = [valor.processo, valor.atendimento].filter(Boolean) as Vinculo[];

  return (
    <Box ref={caixa}>
      <Box position="relative">
        <Input
          id="tf-vinculo"
          role="combobox"
          aria-expanded={mostrarPainel}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Encontre um processo ou atendimento"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
        />

        {mostrarPainel && (
          <Box
            role="listbox"
            position="absolute"
            top="calc(100% + 4px)"
            left="0"
            right="0"
            zIndex={Z_INDEX_CALENDARIO}
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border"
            borderRadius="sm"
            boxShadow="md"
            p="4px"
            maxH="220px"
            overflowY="auto"
          >
            {query.isPending ? (
              <Text p={OPCAO_LINHA.padding} fontSize="13px" color="fg.subtle">
                Procurando…
              </Text>
            ) : resultados.length === 0 ? (
              <Text p={OPCAO_LINHA.padding} fontSize="13px" color="fg.subtle">
                Nada encontrado.
              </Text>
            ) : (
              resultados.map((item) => {
                const jaEscolhido = valor[item.tipo]?.id === item.id;
                return (
                  <chakra.button
                    type="button"
                    role="option"
                    aria-selected={jaEscolhido}
                    key={`${item.tipo}:${item.id}`}
                    display="block"
                    width="100%"
                    textAlign="left"
                    p={OPCAO_LINHA.padding}
                    borderRadius={OPCAO_LINHA.raio}
                    bg={jaEscolhido ? "bg.brand.subtle" : "transparent"}
                    borderWidth="0"
                    cursor="pointer"
                    _hover={{ bg: jaEscolhido ? "bg.brand.subtle" : "bg.canvas" }}
                    onClick={() => escolher(item)}
                  >
                    <Stack gap="1px">
                      <Text fontSize="13px" fontWeight="700" color="fg">
                        {item.rotulo}
                      </Text>
                      {/* O tipo vai SEMPRE, mesmo sem detalhe: numa lista
                          misturada, "0000123-45..." e "Revisão de contrato"
                          não dizem sozinhos de onde vieram. */}
                      <Text fontSize="11.5px" color="fg.subtle">
                        {item.tipo === "processo" ? "Processo" : "Atendimento"}
                        {item.detalhe ? ` · ${item.detalhe}` : ""}
                      </Text>
                    </Stack>
                  </chakra.button>
                );
              })
            )}
          </Box>
        )}
      </Box>

      {escolhidos.length > 0 && (
        <Stack direction="row" gap="6px" wrap="wrap" mt="8px">
          {escolhidos.map((item) => (
            <EtiquetaDeVinculo
              key={`${item.tipo}:${item.id}`}
              vinculo={item}
              onRemover={() => onMudar({ ...valor, [item.tipo]: null })}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
