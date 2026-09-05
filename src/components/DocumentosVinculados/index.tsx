import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

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
import type { RespostaDeDocumentosPaginada } from "../../types/respostas";
import type { DocumentosVinculadosProps } from "./types";

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

  let conteudo: ReactNode;

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

  /* 🔴 O `{modal}` NÃO entra em nenhum ramo -- ver o `return` único no fim. */
  if (query.isPending) {
    conteudo = <Esqueleto linhas={2} />;
  } else

  /* 🔴 Erro NÃO é lista vazia.
   *
   * Sem este ramo, `data || []` faria a aba AFIRMAR que não há documento
   * nenhum num processo que tem doze. O toast some em segundos; a afirmação
   * falsa fica na tela. Mesmo raciocínio já escrito em `TarefasVinculadas` e
   * `ProcessosDoCliente`. */
  if (query.isError) {
    conteudo = (
      <Text fontSize="13px" color="status.bad.text">
        Não foi possível carregar os documentos.
      </Text>
    );
  } else

  if (documentos.length === 0) {
    conteudo = (
      <Flex direction="column" align="flex-start" gap="10px">
        <Text fontSize="13px" color="fg.subtle">
          {vazio}
        </Text>
        {botaoAdicionar}
      </Flex>
    );
  } else {
    conteudo = (
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
    </Box>
    );
  }

  /* 🔴 UM `return` só, com o modal em POSIÇÃO FIXA.
   *
   * Antes, cada ramo devolvia sua própria árvore com o `{modal}` dentro -- e
   * as raízes eram diferentes (`<>`, `<Flex>`, `<Box>`). Quando a lista trocava
   * de estado com o modal aberto, o React via outro tipo de elemento naquela
   * posição, desmontava a subárvore e REMONTAVA o modal: ele continuava na
   * tela e voltava VAZIO, com o arquivo escolhido e o texto digitado perdidos,
   * sem gesto nenhum e sem pergunta.
   *
   * ⚠️ O gatilho é real: `staleTime` é 0 e `refetchOnWindowFocus` está no
   * padrão (ligado), então sair para outro app e voltar recarrega a lista.
   * Medido com o `focusManager`: lista vazia -> com documento zerava o campo.
   *
   * Com o modal como segundo filho SEMPRE do mesmo fragmento, a troca de ramo
   * atinge só o `conteudo`. */
  return (
    <>
      {conteudo}
      {modal}
    </>
  );
}
