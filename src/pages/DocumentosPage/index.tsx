import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";

import { useEstadoNaUrl } from "../../hooks/useEstadoNaUrl";
import { usePaginacaoDaLista } from "../../hooks/usePaginacaoDaLista";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AreaAtualizando,
  Botao,
  CabecalhoDePagina,
  CampoDeBusca,
  CartaoDeTabela,
  EstadoDeErro,
  EstadoVazio,
  Esqueleto,
  IconePlus,
  ModalDeDocumento,
  Pagination,
  Select,
  Tabela,
} from "../../components";
import { useSubgruposBuscaveis } from "../../hooks/useSubgruposBuscaveis";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import { listarDocumentos } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { contar } from "../../utils";
import LinhaDeDocumento from "./components/LinhaDeDocumento";
import { COLUNAS_DE_DOCUMENTOS } from "./constants";
import { useNomeDeSubgrupo } from "../../hooks/useNomeDeSubgrupo";
import type { RespostaDeDocumentosPaginada } from "../../types/respostas";

/** Listagem de documentos do escritório.
 *
 * Mostra os documentos dos subgrupos que a pessoa participa -- o mesmo
 * recorte de Tarefas e Atendimentos, aplicado no servidor.
 *
 * O detalhe é ROTA (`/documentos/:subgrupoId/:documentoId`), e é lá que se
 * edita, se baixa e se exclui. A linha não tem lixeira nem lápis: mesmo
 * arranjo de Processos e Clientes.
 */
export default function DocumentosPage() {
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } = usePaginacaoDaLista();
  const [buscaInput, setBuscaInput] = useEstadoNaUrl("busca", "", { tambemApaga: ["pagina"] });
  const [modalAberto, setModalAberto] = useState(false);
  const navegar = useNavigate();
  /* UMA vez na página, não uma por linha -- a chave do catálogo é
     compartilhada, mas um hook por documento seria uma assinatura de query
     por linha. Mesmo arranjo de `ProcessosPage`. */
  const subgrupoNome = useNomeDeSubgrupo();
  const queryClient = useQueryClient();

  /** Debounce de verdade: sem ele cada tecla vira uma `queryKey` nova e uma
   * requisição -- digitar "contrato" seriam oito. */
  const busca = useValorComEspera(buscaInput);

  const [subgrupoId, setSubgrupoId] = useEstadoNaUrl("subgrupo", "", {
    tambemApaga: ["pagina"],
  });
  /* 🔴 `sempreLigada`: a tela precisa da lista para decidir se MOSTRA o
     filtro, e uma pílula preguiçosa só carregaria quando alguém a abrisse --
     ou seja, o filtro nunca apareceria. */
  const subgrupos = useSubgruposBuscaveis(true);

  const parametros = {
    busca: busca || undefined,
    subgrupoId: subgrupoId || undefined,
    pagina,
    tamanhoPagina,
  };

  const query = useQuery<RespostaDeDocumentosPaginada>({
    queryKey: qk.documentos(parametros),
    /* Mantém a página anterior enquanto a nova vem. Sem isto a chave nasce
       fria, `isPending` vira true e a tabela DESMONTA -- pisca a cada
       página e a cada tecla da busca. */
    placeholderData: keepPreviousData,
    queryFn: () => listarDocumentos(parametros) as Promise<RespostaDeDocumentosPaginada>,
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os documentos.");

  const documentos = query.data?.documentos || [];
  const total = query.data?.total ?? 0;

  const buscando = query.isPlaceholderData || buscaInput !== busca;

  return (
    <Box>
      <Box mb="14px">
        <CabecalhoDePagina
          titulo="Documentos"
          subtitulo="Arquivos e links do escritório, cada um no processo, atendimento ou cliente a que pertence."
          acoes={
            <Botao onClick={() => setModalAberto(true)}>
              <IconePlus />
              Adicionar documento
            </Botao>
          }
        />

        <Flex align="center" gap="8px" wrap="wrap" mb="10px">
          <CampoDeBusca
            rotulo="Buscar documentos"
            valor={buscaInput}
            onMudar={(valor) => {
              setBuscaInput(valor);
            }}
            /* 🔴 Só título e descrição: `documentos_service.listar_pagina`
               compara esses dois campos, nunca o nome do cliente nem o número
               do processo. Prometer mais faria a pessoa digitar o que está
               vendo na coluna "Vínculo", receber "Nenhum documento" e
               concluir que não tem nenhum. */
            placeholder="Buscar por título ou descrição"
          />
          {/* ⚠️ Some para quem tem UM subgrupo: ali não filtra nada, e um
              controle sem efeito é pior que controle nenhum. Mesma régua de
              Processos e Atendimentos.

              🔴 `primeiraPagina`, não `opcoes`: `opcoes` encolhe conforme
              alguém digita na pílula, e o docstring de `OpcoesBuscaveis`
              registra três defeitos vindos disso -- um deles é justamente um
              controle sumir da tela porque a busca não achou nada. */}
          {subgrupos.primeiraPagina.length > 1 && (
            <Select
              variante="chip"
              placeholder="Todos os subgrupos"
              opcoes={subgrupos.primeiraPagina}
              valor={subgrupoId}
              onMudar={(v) => setSubgrupoId(v)}
              permitirLimpar
            />
          )}
        </Flex>

        {/* A contagem só aparece quando há número de verdade. Durante a
            espera ela diria "Mostrando 0 de 0", que é uma afirmação falsa
            sobre uma lista que ainda não chegou. */}
        <Text fontSize="12.5px" color="fg.muted" minH="18px">
          {query.isPending || buscando
            ? ""
            : `Mostrando ${documentos.length} de ${contar(total, "documento", "documentos")}`}
        </Text>
      </Box>

      {query.isPending ? (
        <Esqueleto linhas={6} />
      ) : query.isError ? (
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar os documentos."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <AreaAtualizando atualizando={query.isPlaceholderData}>
          <CartaoDeTabela>
            <Tabela
              colunas={COLUNAS_DE_DOCUMENTOS}
              vazio={
                documentos.length === 0 ? (
                  <EstadoVazio
                    /* Distingue "não existe nada" de "sua busca não achou
                       nada" -- confundir os dois faz a pessoa concluir que o
                       escritório não guardou documento nenhum. */
                    mensagem={
                      busca
                        ? "Nenhum documento com esse termo."
                        : "Nenhum documento adicionado ainda."
                    }
                    acao={
                      busca ? (
                        <Botao
                          variante="ghost"
                          onClick={() => {
                            setBuscaInput("");
                          }}
                        >
                          Limpar busca
                        </Botao>
                      ) : undefined
                    }
                  />
                ) : undefined
              }
            >
              {documentos.map((documento) => (
                <LinhaDeDocumento
                  key={`${documento.subgrupo_id}:${documento.documento_id}`}
                  documento={documento}
                  subgrupoNome={subgrupoNome}
                  onAbrir={(d) => navegar(`/documentos/${d.subgrupo_id}/${d.documento_id}`)}
                />
              ))}
            </Tabela>

          {/* ⚠️ Sem guarda de "tem linha": o `Pagination` já se esconde
              sozinho quando não há o que paginar (`total <= menor tamanho`),
              e a guarda escondia justamente o caso em que ele PRECISA
              aparecer -- página fora da faixa, com a lista vazia e o total
              cheio. Era ali que a pessoa ficava presa sem botão. */}
              <Pagination
                pagina={pagina}
                totalPaginas={query.data?.total_paginas ?? 1}
                tamanhoPagina={tamanhoPagina}
                total={total}
                onMudarPagina={setPagina}
                onMudarTamanho={setTamanhoPagina}
              />

          </CartaoDeTabela>
        </AreaAtualizando>
      )}

      {modalAberto && (
        <ModalDeDocumento
          onSalvo={() => queryClient.invalidateQueries({ queryKey: ["documentos"] })}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </Box>
  );
}
