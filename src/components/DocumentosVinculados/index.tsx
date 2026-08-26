import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

/* Irmãos importados um a um, e não pelo índice de `components`: este
   componente É exportado por aquele índice, e importar dele criaria um ciclo
   -- mesmo padrão do `ModalDeTarefa`. */
import Botao from "../Botao";
import { BotaoNu } from "../BotaoNu";
import Esqueleto from "../Esqueleto";
import EtiquetaDeMetadado from "../EtiquetaDeMetadado";
import { IconePlus } from "../Icons";
import ModalDeDocumento from "../ModalDeDocumento";
import Pagination from "../Pagination";
import Ponto from "../Ponto";
import { TAMANHO_PAGINA_PADRAO } from "../../constants/paginacao";
import { DOCUMENTO_ARQUIVO, formatarTamanho, rotuloDoTipo } from "../../constants/documento";
import { listarDocumentos } from "../../services";
import { qk } from "../../services/queryKeys";
import type { Vinculo } from "../../types";
import type { RespostaDeDocumentosPaginada } from "../../types/respostas";

interface DocumentosVinculadosProps {
  /** UM filtro por vez -- é como as três abas o usam, e é o que a rota faz
   * de melhor: cada campo a mais estreita a mesma varredura. */
  filtro: { processoNumero?: string; atendimentoId?: string; clienteId?: string };
  /** Subgrupo em que o modal de criação abre.
   *
   * ⚠️ Ausente na aba do CLIENTE, e não por esquecimento: cliente é do
   * GRUPO, não de um subgrupo, então não há qual oferecer. Lá o modal cai no
   * primeiro subgrupo da lista, como em qualquer criação sem contexto. */
  subgrupoInicial?: string;
  /** O vínculo já preenchido no modal, COM o rótulo que a pessoa reconhece
   * -- o número mascarado do processo, o assunto do atendimento. Sem ele o
   * modal mostraria o id cru na etiqueta. */
  vinculoInicial?: Vinculo | null;
  clienteInicial?: { id: string; nome: string } | null;
  /** A frase do vazio. Nomeia a coisa ("…a este processo"): "Nenhum
   * documento" sozinho não diz se a lista está vazia ou filtrada. */
  vazio: string;
}

/** Os documentos ligados a um processo, atendimento ou cliente.
 *
 * Mora em `components/` porque as TRÊS telas de detalhe montam a mesma aba.
 * Uma cópia por tela seria três lugares pra corrigir quando a listagem
 * mudar -- e é assim que uma delas fica pra trás.
 *
 * 🔴 **Pagina de verdade.** As abas irmãs (`TarefasVinculadas`,
 * `ProcessosDoCliente`) trazem a lista inteira, e aqui isso não serve: a
 * rota de documentos é paginada, então sem paginação a aba mostraria os 10
 * primeiros e ficaria calada sobre o resto. Documento que existe e não
 * aparece é pior que uma barra de páginas a mais.
 */
export default function DocumentosVinculados({
  filtro,
  subgrupoInicial,
  vinculoInicial,
  clienteInicial,
  vazio,
}: DocumentosVinculadosProps) {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [modalAberto, setModalAberto] = useState(false);

  const parametros = { ...filtro, pagina, tamanhoPagina };

  const query = useQuery<RespostaDeDocumentosPaginada>({
    queryKey: qk.documentos(parametros),
    placeholderData: keepPreviousData,
    queryFn: () => listarDocumentos(parametros) as Promise<RespostaDeDocumentosPaginada>,
  });

  const documentos = query.data?.documentos || [];
  const totalPaginas = query.data?.total_paginas ?? 1;

  const botaoAdicionar = (
    <Botao variante="ghost" type="button" onClick={() => setModalAberto(true)}>
      <IconePlus />
      Adicionar documento
    </Botao>
  );

  const modal = modalAberto && (
    <ModalDeDocumento
      subgrupoInicial={subgrupoInicial}
      vinculosIniciais={
        vinculoInicial
          ? { [vinculoInicial.tipo]: vinculoInicial }
          : undefined
      }
      clientesIniciais={
        clienteInicial
          ? { ids: [clienteInicial.id], nomes: new Map([[clienteInicial.id, clienteInicial.nome]]) }
          : undefined
      }
      /* Prefixo: derruba esta lista, a listagem geral e as abas das outras
         telas de uma vez -- o documento novo pode aparecer em todas. */
      onSalvo={() => queryClient.invalidateQueries({ queryKey: ["documentos"] })}
      onFechar={() => setModalAberto(false)}
    />
  );

  if (query.isPending) {
    return (
      <>
        <Esqueleto linhas={2} />
        {modal}
      </>
    );
  }

  /* 🔴 Erro NÃO é lista vazia.
   *
   * Sem este ramo, `data || []` faria a aba AFIRMAR que não há documento
   * nenhum num processo que tem doze. O toast some em segundos; a afirmação
   * falsa fica na tela. Mesmo raciocínio já escrito em `TarefasVinculadas` e
   * `ProcessosDoCliente`. */
  if (query.isError) {
    return (
      <>
        <Text fontSize="13px" color="status.bad.text">
          Não foi possível carregar os documentos.
        </Text>
        {modal}
      </>
    );
  }

  if (documentos.length === 0) {
    return (
      <Flex direction="column" align="flex-start" gap="10px">
        <Text fontSize="13px" color="fg.subtle">
          {vazio}
        </Text>
        {botaoAdicionar}
        {modal}
      </Flex>
    );
  }

  return (
    <Box>
      {documentos.map((d) => (
        <BotaoNu
          key={`${d.subgrupo_id}:${d.documento_id}`}
          type="button"
          onClick={() => navegar(`/documentos/${d.subgrupo_id}/${d.documento_id}`)}
          display="flex"
          alignItems="center"
          gap="10px"
          w="100%"
          py="7px"
          px="4px"
          borderRadius="sm"
          flexWrap="wrap"
          _hover={{ bg: "bg.canvas" }}
        >
          {/* Mesma bolinha das outras listas destas telas. */}
          <Ponto />
          <Text fontSize="13px" flex="1" minW="0" truncate>
            {d.titulo}
          </Text>
          <Flex gap="6px" flexShrink={0}>
            <EtiquetaDeMetadado>{rotuloDoTipo(d.tipo)}</EtiquetaDeMetadado>
            {/* O tamanho só faz sentido em arquivo -- link não tem nenhum. */}
            {d.tipo === DOCUMENTO_ARQUIVO && d.tamanho_bytes ? (
              <EtiquetaDeMetadado>{formatarTamanho(d.tamanho_bytes)}</EtiquetaDeMetadado>
            ) : null}
            {(d.responsavel_nome || d.responsavel_id) && (
              <EtiquetaDeMetadado>{d.responsavel_nome || d.responsavel_id}</EtiquetaDeMetadado>
            )}
          </Flex>
        </BotaoNu>
      ))}

      {/* A barra só quando há segunda página: com uma só, ela seria uma
          linha de controles que não controla nada. */}
      {totalPaginas > 1 && (
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          tamanhoPagina={tamanhoPagina}
          total={query.data?.total ?? 0}
          onMudarPagina={setPagina}
          onMudarTamanho={(novo) => {
            setTamanhoPagina(novo);
            setPagina(1);
          }}
        />
      )}

      <Box mt="10px">{botaoAdicionar}</Box>
      {modal}
    </Box>
  );
}
