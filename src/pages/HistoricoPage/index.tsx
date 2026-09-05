import { Flex, Stack, Text } from "@chakra-ui/react";

import { useEstadoNaUrl } from "../../hooks/useEstadoNaUrl";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import { usePaginacaoDaLista } from "../../hooks/usePaginacaoDaLista";
import { useParametrosDaUrl } from "../../hooks/useParametrosDaUrl";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Botao, CabecalhoDePagina, CampoDeBusca, CartaoDeTabela, AreaAtualizando, EstadoVazio, EstadoDeErro, Esqueleto, IconePlus, Modal, ModalDeTarefa, Pagination } from "../../components";
import { listarHistorico } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useNomesDeSubgruposVisiveis } from "../../hooks/useNomesDeSubgruposVisiveis";
import { useTodosOsSubgrupos } from "../../hooks/useTodosOsSubgrupos";
import { contar, mascararNumeroProcesso } from "../../utils";
import DetalheHistorico from "./components/DetalheHistorico";
import FiltroDeMenu from "./components/FiltroDeMenu";
import ItemDeHistorico from "./components/ItemDeHistorico";
import { useLinkProfundoDoHistorico } from "./hooks/useLinkProfundoDoHistorico";
import {
  FILTROS_DE_FALHA,
  FILTROS_DE_PERIODO,
  TIPOS_DE_ENVIO,
  TIPO_DE_ENVIO_PADRAO,
} from "./constants";
import type { HistoricoItem } from "../../types";
import type { RespostaDeHistoricoPaginada, RespostaDeTotal } from "../../types/respostas";
import type { HistoricoPageProps } from "./types";

/** Histórico dos e-mails que o sistema mandou.
 *
 * A tela abre filtrada em Movimentações: é o que se olha no dia a dia, e
 * lembrete é diário -- sem filtro ele dominaria a lista.
 */
export default function HistoricoPage({
  deepLink,
  tipoEnvioInicial,
  apenasComFalhaInicial,
  diasInicial,
  onDeepLinkConsumido,
}: HistoricoPageProps) {
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } = usePaginacaoDaLista();
  /* ⚠️ Os filtros vão para a URL JUNTO com a página: restaurar a página sem
     o filtro que a produziu mostraria uma página diferente.

     ⚠️ O valor que vem por PROP (o link da Área de trabalho) é o padrão do
     parâmetro -- é assim que a tela abre já filtrada sem sujar a URL. E
     "limpar filtros" continua exprimível porque o codec escreve tudo que
     DIFERE do padrão, inclusive `falha=0`. */
  /* 🔴 Os padrões num lugar SÓ. Eles aparecem duas vezes -- ao declarar cada
     filtro e ao limpar todos -- e o que some da URL é justamente o que
     coincide com eles. Repetidos à mão, "limpar" grava o que ele acha que é
     o padrão, o parâmetro é omitido, e a leitura devolve o filtro de volta:
     o botão parece não funcionar. */
  const PADROES = {
    tipo: tipoEnvioInicial ?? TIPO_DE_ENVIO_PADRAO,
    falha: apenasComFalhaInicial ?? false,
    dias: diasInicial ?? 0,
  };
  const [tipoEnvio, setTipoEnvio] = useEstadoNaUrl("tipo", PADROES.tipo, {
    tambemApaga: ["pagina"],
  });
  const [apenasComFalha, setApenasComFalha] = useEstadoNaUrl("falha", PADROES.falha, {
    tambemApaga: ["pagina"],
  });
  const [dias, setDias] = useEstadoNaUrl("dias", PADROES.dias, {
    tambemApaga: ["pagina"],
  });
  /* Os dois filtros novos (03/09/2026), na URL como os três acima -- senão
     morrem no F5 e o link não pode ser mandado pra ninguém. */
  const [subgrupoId, setSubgrupoId] = useEstadoNaUrl("subgrupo", "", {
    tambemApaga: ["pagina"],
  });
  const [numeroInput, setNumeroInput] = useEstadoNaUrl("processo", "", {
    tambemApaga: ["pagina"],
  });
  /* 🔴 Espera entre teclas, como em Documentos e Clientes: sem ela cada
     tecla vira uma `queryKey` nova e uma requisição -- digitar um número de
     processo seriam VINTE. O campo mostra o que foi digitado na hora; quem
     espera é a consulta. */
  const numeroProcesso = useValorComEspera(numeroInput);
  const { atualizar } = useParametrosDaUrl();

  /* UMA vez na página, não uma por item. ⚠️ `Visiveis` e não `Nome`: aqui a
     lista pode conter subgrupo que a pessoa não participa, e o comportamento
     tem de ser DESCARTAR, não cair para o id. Ver o hook. */
  const subgruposVisiveis = useNomesDeSubgruposVisiveis();

  /* As opções do chip de subgrupo: "Todos" mais os que a pessoa participa.
     ⚠️ O catálogo JÁ vem recortado pelo servidor (`GET /subgrupos` é
     escopado), então não há o que filtrar aqui -- e não se deve inventar uma
     segunda régua de permissão no front. */
  const subgruposQuery = useTodosOsSubgrupos();
  const opcoesDeSubgrupo = [
    { id: "todos", valor: "", rotulo: "Todos os subgrupos" },
    ...(subgruposQuery.data || []).map((sg) => ({
      id: sg.subgrupo_id,
      valor: sg.subgrupo_id,
      rotulo: sg.nome,
    })),
  ];
  const [itemAberto, setItemAberto] = useState<HistoricoItem | null>(null);
  const [criandoTarefa, setCriandoTarefa] = useState(false);

  /** De qual subgrupo a tarefa nasceria -- `null` quando não há resposta
   * certa, e aí o botão não aparece. Ver o comentário no modal abaixo.
   *
   * 🔴 `subgrupos_notificados` é OPCIONAL e é uma LISTA: são três estados
   * (ausente, um, vários), não dois. Um `[0]` cru estouraria no ausente e
   * escolheria errado no plural. */
  const notificados = itemAberto?.subgrupos_notificados;
  const subgrupoDaTarefa =
    itemAberto && !itemAberto.tarefa_id && notificados?.length === 1 ? notificados[0] : null;
  const query = useQuery<RespostaDeHistoricoPaginada>({
    queryKey: qk.historico({ pagina, tamanhoPagina, tipoEnvio, apenasComFalha, dias, subgrupoId, numeroProcesso }),
    /* Mantém a página anterior na tela enquanto a nova vem. Sem isto a
       `queryKey` muda, a chave nasce fria, `isPending` vira `true` e a
       tabela DESMONTA -- pisca a cada página, a cada filtro e a cada tecla
       da busca. O `AreaAtualizando` em volta é que diz que o conteúdo
       visível ainda é o antigo. */
    placeholderData: keepPreviousData,
    queryFn: () =>
      listarHistorico({ pagina, tamanhoPagina, tipoEnvio, apenasComFalha, dias, subgrupoId, numeroProcesso }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar o histórico.");
  const historico = query.data?.historico || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  /** Total sem filtro nenhum -- é o "de Y" da contagem. Uma página de
   * tamanho 1: só o `total` do envelope interessa, e o React Query mantém
   * em cache. */
  const totalQuery = useQuery<RespostaDeTotal>({
    queryKey: qk.historico({ pagina: 1, tamanhoPagina: 1, tipoEnvio: "" }),
    queryFn: () => listarHistorico({ pagina: 1, tamanhoPagina: 1 }),
  });
  const totalSemFiltro = totalQuery.data?.total ?? 0;

  const { resolvendo: resolvendoLink } = useLinkProfundoDoHistorico(deepLink, setItemAberto, onDeepLinkConsumido);

  /* Voltar pra página 1 a cada filtro: estar na página 4 de um conjunto que
     acabou de encolher pra 2 páginas mostraria vazio sem motivo.

     ⚠️ Quem faz isso agora é o `tambemApaga` de cada filtro, numa escrita
     só -- chamar `setPagina(1)` em seguida partiria da mesma URL e apagaria
     o filtro que acabou de ser escrito. */

  /** O caminho de volta do estado vazio: derruba TODOS os filtros de uma vez.
   *
   * ⚠️ `""` no tipo, e não `TIPO_DE_ENVIO_PADRAO` -- a tela abre em
   * "Movimentações", mas "ver todos" tem que ver todos. Voltar pro padrão
   * deixaria os lembretes de fora e a lista poderia seguir vazia. */
  function limparFiltros() {
    /* ⚠️ Escreve os valores neutros em vez de APAGAR as chaves: apagar
       devolveria o padrão, e aqui o padrão pode ser o filtro que veio da
       Área de trabalho -- "limpar" traria ele de volta. */
    /* ⚠️ Os CINCO. Quando limpava só o tipo, "o botão de saída não saía" --
       o comentário acima é dessa época. Os dois novos entram pela mesma
       razão: um filtro que sobrevive ao "ver todos" deixa a lista vazia e a
       pessoa sem caminho. */
    atualizar(
      { tipo: "", falha: false, dias: 0, subgrupo: "", processo: "" },
      { tambemApaga: ["pagina"] },
    );
  }

  return (
    <>
      <CabecalhoDePagina
        titulo="Histórico"
        subtitulo="Movimentações detectadas e notificações enviadas."
      />

      <Flex align="center" gap="8px" wrap="wrap" mb="18px">
        <FiltroDeMenu opcoes={TIPOS_DE_ENVIO} valor={tipoEnvio} onMudar={setTipoEnvio} />
        <FiltroDeMenu opcoes={FILTROS_DE_FALHA} valor={apenasComFalha} onMudar={setApenasComFalha} />
        <FiltroDeMenu opcoes={FILTROS_DE_PERIODO} valor={dias} onMudar={setDias} />
        {/* 🔴 Só aparece com DOIS ou mais subgrupos: com um só, o filtro não
            filtra nada e ocupa a barra. Mesma régua da pílula de subgrupo de
            Processos, e o motivo está escrito lá. */}
        {opcoesDeSubgrupo.length > 2 && (
          <FiltroDeMenu opcoes={opcoesDeSubgrupo} valor={subgrupoId} onMudar={setSubgrupoId} />
        )}
        {/* ⚠️ Campo de TEXTO, e não um seletor: são milhares de processos, e
            a pessoa chega aqui com o número na mão -- do e-mail, do sistema do
            tribunal, de um papel.

            🔴 `CampoDeBusca`, e não um `Input` cru: é a mesma caixa de
            Processos, Clientes e Grupo -- lupa por dentro, fundo de
            superfície, borda de 1px. A primeira versão usava `Input size="sm"`
            e ficava visivelmente diferente da busca das outras telas, na
            mesma barra de filtros. */}
        {/* ⚠️ SEM `larguraMaxima`: o padrão do componente é 340px, a medida
            que Clientes e Documentos usam (Processos tem 420px porque a busca
            dele cobre número, cliente e apelido). A primeira versão passava
            230px, um valor avulso -- e um número de processo mascarado tem 25
            caracteres, então o campo ficava apertado justamente no dado que
            ele recebe. */}
        {/* 🔴 "Buscar" e "ou parte", e não "Filtrar"/"Número do processo": o
            campo BUSCA por pedaço (a API compara por dígito), e o rótulo
            antigo prometia igualdade. Quem digitou "3802" esperando o fim de
            um número e recebeu nada foi a queixa que abriu isto. */}
        <CampoDeBusca
          rotulo="Buscar por número do processo"
          placeholder="Número do processo ou parte"
          valor={numeroInput}
          onMudar={setNumeroInput}
          buscando={numeroInput !== numeroProcesso}
        />
      </Flex>

      {/* Some enquanto carrega, em vez de dizer "carregando…": o esqueleto
          logo abaixo já é o recado, e duas mensagens da mesma espera na
          mesma tela é ruído. Mantém a linha ocupando o espaço pra a
          contagem não empurrar a tabela ao chegar. */}
      <Text fontSize="11.5px" color="fg.subtle" mb="10px" minH="17px">
        {query.isPending
          ? ""
          : `Mostrando ${total} de ${contar(totalSemFiltro, "envio", "envios")}`}
      </Text>

      {query.isPending ? (
        <Esqueleto linhas={4} />
      ) : query.isError ? (
        /* Sem isto a tela dizia "Nenhum e-mail enviado ainda" numa falha de
           rede -- e, como `totalSemFiltro` também caía pra 0, nem o "Ver
           todos os envios" aparecia pra desmentir. */
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar o histórico."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <CartaoDeTabela>
          {historico.length === 0 ? (
            /* Vazio por filtro é diferente de vazio de verdade -- e como a
               tela abre filtrada, "não tem nada" costuma ser mentira. Por
               isso o caminho de saída fica junto do recado. */
            <EstadoVazio
              /* 🔴 "deste tipo" mentia desde que a tela ganhou mais dois
                 filtros: o vazio pode vir de "Só com falha" ou do recorte de
                 período, e a frase mandava a pessoa olhar pro filtro errado. */
              mensagem={
                totalSemFiltro > 0
                  ? "Nenhum envio com esses filtros."
                  : "Nenhum e-mail enviado ainda. Os avisos de movimentação e de prazo aparecem aqui."
              }
              acao={
                totalSemFiltro > 0 && (
                  /* ⚠️ Limpa os TRÊS. Antes limpava só o tipo -- com "Só com
                     falha" ligado, o botão de saída não saía: a lista seguia
                     vazia e o único caminho de volta não levava a lugar
                     nenhum. */
                  <Botao variante="ghost" onClick={limparFiltros}>
                    Ver todos os envios
                  </Botao>
                )
              }
            />
          ) : (
            <>
              <AreaAtualizando atualizando={query.isPlaceholderData}>
                {historico.map((h, i) => (
                  <ItemDeHistorico
                    key={`${h.numero_processo}-${h.enviado_em}-${i}`}
                    item={h}
                    subgruposVisiveis={subgruposVisiveis}
                    onAbrir={setItemAberto}
                  />
                ))}
              </AreaAtualizando>
              <Pagination
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={total}
                tamanhoPagina={tamanhoPagina}
                onMudarPagina={setPagina}
                onMudarTamanho={setTamanhoPagina}
              />
            </>
          )}
        </CartaoDeTabela>
      )}

      {/* O modal abre JÁ na resolução do link do e-mail, não só quando o
          registro é encontrado. Quem chega por um link vindo de fora não
          tem contexto nenhum: sem isto ela cai numa lista comum, sem nada
          indicando que o item do link está sendo buscado -- e se falhar, só
          um toast que ela pode nem associar ao link. */}
      {/* 🔴 O botão só existe quando há UM subgrupo certo pra tarefa nascer.
          Três casos deixam ele de fora, e cada um por um motivo diferente:

          1. LEMBRETE DE TAREFA (`tarefa_id`): não tem processo nenhum --
             `numero_processo` ali guarda `TAREFA#{id}` porque é chave de
             partição. Vincular a tarefa nova a isso gravaria lixo num campo
             que a tela lê como número de processo.
          2. VÁRIOS subgrupos notificados: o mesmo número vive em N
             subgrupos e o e-mail foi pra todos. Escolher um arbitrariamente
             faria a tarefa nascer no lugar errado sem ninguém perceber, e
             `ModalDeTarefa` não tem estado "nenhum subgrupo" -- `subgrupoAtual`
             é obrigatório e semeia o seletor.
          3. AUSENTE: `subgrupos_notificados` é opcional, e registro anterior
             a 26/08/2026 não o tem (9 de 73 medidos em produção). `undefined`
             é "não sei", e não se oferece o que não se sabe. */}
      {(itemAberto || resolvendoLink) && (
        <Modal
          descarte="semFormulario"
          titulo="Detalhes do envio"
          onFechar={() => setItemAberto(null)}
          acaoNoCabecalho={
            subgrupoDaTarefa ? (
              <Botao variante="ghost" onClick={() => setCriandoTarefa(true)}>
                <IconePlus />
                Adicionar tarefa
              </Botao>
            ) : undefined
          }
        >
          {itemAberto ? (
            <DetalheHistorico item={itemAberto} />
          ) : (
            <Stack gap="14px" py="6px">
              <Text fontSize="13.5px" color="fg.subtle">
                Localizando a notificação do link recebido…
              </Text>
              <Esqueleto linhas={3} altura="20px" />
            </Stack>
          )}
        </Modal>
      )}

      {/* Irmão do modal de detalhe: os dois ficam abertos, e só este sai ao
          salvar -- fechar os dois devolveria a pessoa pra lista sem o envio
          que ela estava lendo. O Escape fecha só o de cima (`pilhaDeModais`). */}
      {criandoTarefa && itemAberto && subgrupoDaTarefa && (
        <ModalDeTarefa
          subgrupoAtual={subgrupoDaTarefa}
          vinculoInicial={{
            tipo: "processo",
            id: itemAberto.numero_processo,
            rotulo: mascararNumeroProcesso(itemAberto.numero_processo),
          }}
          onSalvo={() => setCriandoTarefa(false)}
          onFechar={() => setCriandoTarefa(false)}
        />
      )}
    </>
  );
}
